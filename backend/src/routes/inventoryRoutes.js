const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getSurgeMultiplier, calculateAdjustedPrice } = require('../utils/surgePricing');
const inventoryAlertController = require('../controllers/inventoryAlertController');
const { logAudit } = require('../utils/auditLogger');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

const pool = db.pool || db;

router.post('/', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), validate(schemas.inventoryDeduction), async (req, res) => {
  const { items } = req.body;

  // Validate incoming payload
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Order items array is required.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch active multiplier (returns 1.00 if dynamic pricing is disabled by admin)
    const multiplier = await getSurgeMultiplier();
    const processedItems = [];

    for (const item of items) {
      const { inventory_id, quantity } = item;

      if (!inventory_id || !quantity || quantity <= 0) {
        throw new Error('Each item must contain a valid inventory_id and a quantity greater than 0.');
      }

      // 1. Fetch current item state using row-level locking (FOR UPDATE)
      // FIX: Changed 'price' to 'base_price'
      const checkRes = await client.query(
        `SELECT id, item_name, base_price, stock_quantity, is_active 
         FROM inventory 
         WHERE id = $1 FOR UPDATE`,
        [inventory_id]
      );

      if (checkRes.rows.length === 0) {
        throw new Error(`Inventory item #${inventory_id} not found.`);
      }

      const currentItem = checkRes.rows[0];

      // Guard Clause 1: Active status and zero stock check
      if (!currentItem.is_active || currentItem.stock_quantity <= 0) {
        throw new Error(`Item "${currentItem.item_name}" is out of stock.`);
      }

      // Guard Clause 2: Check if requested quantity exceeds available inventory
      if (quantity > currentItem.stock_quantity) {
        throw new Error(
          `Cannot fulfill order for "${currentItem.item_name}". Requested quantity (${quantity}) exceeds remaining stock (${currentItem.stock_quantity}).`
        );
      }

      // 2. Compute updated inventory levels
      const newStock = currentItem.stock_quantity - quantity;
      const isStillActive = newStock > 0;

      // 3. Persist updated stock and active state
      const updateRes = await client.query(
        `UPDATE inventory 
         SET stock_quantity = $1, 
             is_active = $2, 
             updated_at = NOW() 
         WHERE id = $3 
         RETURNING *`,
        [newStock, isStillActive, inventory_id]
      );

      // Write stock log
      await client.query(
        `INSERT INTO stock_logs (inventory_id, new_quantity, change_amount, reason)
         VALUES ($1, $2, $3, $4)`,
        [inventory_id, newStock, -quantity, 'Order deduction']
      );

      // Check for low stock alert after deduction
      const alertResult = await inventoryAlertController.createAlertIfNeeded(inventory_id);

      // Attach dynamic pricing calculation to response item details
      // FIX: Reference currentItem.base_price instead of currentItem.price
      const rawBasePrice = currentItem.base_price || 0;
      const adjustedPrice = calculateAdjustedPrice(rawBasePrice, multiplier);

      processedItems.push({
        ...updateRes.rows[0],
        base_price: parseFloat(rawBasePrice),
        current_unit_price: adjustedPrice
      });
    }

    // Commit transaction only when all items validate and update cleanly
    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Order processed successfully and inventory deducted.',
      appliedMultiplier: multiplier,
      deducted_items: processedItems
    });

  } catch (err) {
    // Roll back all changes if any item fails validation or database error occurs
    if (client) await client.query('ROLLBACK');
    return res.status(400).json({
      success: false,
      error: err.message
    });

  } finally {
    if (client) client.release();
  }
});

/**
 * GET /api/inventory
 * Fetch full inventory list with active dynamic pricing applied
 */
router.get('/', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY id ASC');
    
    // Fetch current dynamic pricing multiplier
    const multiplier = await getSurgeMultiplier();

    // Attach active dynamic prices to inventory items
    // FIX: Reference item.base_price instead of item.price
    const inventoryWithPricing = result.rows.map(item => {
      const rawBasePrice = item.base_price || 0;
      return {
        ...item,
        base_price: parseFloat(rawBasePrice),
        current_price: calculateAdjustedPrice(rawBasePrice, multiplier)
      };
    });

    return res.status(200).json({
      success: true,
      appliedMultiplier: multiplier,
      inventory: inventoryWithPricing
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * PATCH /api/inventory/:id/toggle
 * Manually toggle an item's availability (Active / Disabled) by staff/admin
 */
router.patch('/:id/toggle', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.toggleInventory), async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  try {
    let query;
    let params;

    const beforeRes = await pool.query(`SELECT is_active FROM inventory WHERE id = $1`, [id]);
    if (beforeRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Inventory item #${id} not found.` });
    }
    const oldIsActive = beforeRes.rows[0].is_active;

    if (typeof is_active === 'boolean') {
      query = `UPDATE inventory SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *`;
      params = [is_active, id];
    } else {
      query = `UPDATE inventory SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING *`;
      params = [id];
    }

    const result = await pool.query(query, params);

    const updatedItem = result.rows[0];

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'INVENTORY_TOGGLED',
      entity_type: 'inventory',
      entity_id: parseInt(id),
      old_value: oldIsActive ? 'true' : 'false',
      new_value: updatedItem.is_active ? 'true' : 'false',
      ip_address: req.ip || req.connection.remoteAddress
    });

    // Emit live WebSocket update to all connected customer apps
    const io = req.app.get('io');
    if (io) {
      io.emit('inventory_item_updated', {
        itemId: updatedItem.id,
        itemName: updatedItem.item_name || updatedItem.name,
        isActive: updatedItem.is_active,
        stockQuantity: updatedItem.stock_quantity
      });
    }

    return res.status(200).json({
      success: true,
      message: `Item '${updatedItem.item_name || 'Item #' + id}' status set to ${updatedItem.is_active ? 'AVAILABLE' : 'DISABLED/OUT_OF_STOCK'}`,
      item: updatedItem
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/inventory/alerts
 * Fetch all active low-stock alerts
 */
router.get('/alerts', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), inventoryAlertController.getActiveAlerts);

/**
 * GET /api/inventory/alerts/history
 * Fetch all alerts including acknowledged and resolved
 */
router.get('/alerts/history', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), inventoryAlertController.getAlertHistory);

/**
 * POST /api/inventory/alerts/:id/acknowledge
 * Mark an alert as acknowledged
 */
router.post('/alerts/:id/acknowledge', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), inventoryAlertController.acknowledgeAlert);

/**
 * POST /api/inventory/alerts/:id/resolve
 * Mark an alert as resolved
 */
router.post('/alerts/:id/resolve', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), inventoryAlertController.resolveAlert);

/**
 * POST /api/inventory/log-waste
 * Log waste/spoilage for inventory items
 */
router.post('/log-waste', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), validate(schemas.logWaste), async (req, res) => {
  const { inventory_id, quantity, reason } = req.body;

  if (!inventory_id || !quantity || quantity <= 0) {
    return res.status(400).json({ success: false, error: 'inventory_id and positive quantity are required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const itemRes = await client.query(
      `SELECT id, item_name, stock_quantity FROM inventory WHERE id = $1 FOR UPDATE`,
      [inventory_id]
    );

    if (itemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Inventory item not found.' });
    }

    const newStock = Math.max(0, itemRes.rows[0].stock_quantity - quantity);

    await client.query(
      `UPDATE inventory SET stock_quantity = $1, updated_at = NOW() WHERE id = $2`,
      [newStock, inventory_id]
    );

    await client.query(
      `INSERT INTO stock_logs (inventory_id, new_quantity, change_amount, reason)
       VALUES ($1, $2, $3, $4)`,
      [inventory_id, newStock, -quantity, `Waste: ${reason || 'No reason provided'}`]
    );

    await client.query(
      `INSERT INTO waste_logs (inventory_id, quantity, reason, logged_by)
       VALUES ($1, $2, $3, $4)`,
      [inventory_id, quantity, reason || null, req.user?.id || null]
    );

    await client.query('COMMIT');

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'WASTE_LOGGED',
      entity_type: 'inventory',
      entity_id: inventory_id,
      new_value: JSON.stringify({ quantity, reason, new_stock: newStock }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(201).json({
      success: true,
      message: 'Waste logged and inventory updated.',
      new_stock: newStock,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;