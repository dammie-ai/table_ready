const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getSurgeMultiplier, calculateAdjustedPrice } = require('../utils/surgePricing');
const { logAudit } = require('../utils/auditLogger');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');

// Safely handle both direct and destructured pool export patterns
const pool = db.pool || db;

// Valid order status transitions
const VALID_STATUSES = ['RECEIVED', 'IN_PREPARATION', 'COOKING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];

/**
 * POST /api/orders
 * Handle new order creation with automatic recipe-based ingredient deduction
 */
router.post('/', async (req, res) => {
  let client;

  try {
    client = await pool.connect();
  } catch (connectErr) {
    return res.status(500).json({
      success: false,
      error: `Database connection error: ${connectErr.message}`
    });
  }

  try {
    const { order_type, is_held, items, table_number, notes, ordered_by_user_id } = req.body;

    // Automatically hold the order if placed from home or explicitly flagged as held
    const shouldHold = is_held === true || order_type === 'ORDER_FROM_HOME';
    const initialStatus = shouldHold ? 'ON_HOLD' : 'RECEIVED';

    await client.query('BEGIN');

    // 1. Fetch active surge multiplier (returns 1.00 if feature is turned off by admin)
    const multiplier = await getSurgeMultiplier();

    // 2. Resolve Recipe Ingredients & Perform Row-Level Lock Stock Validation
    let calculatedTotal = 0;
    const resolvedDeductions = []; // Stores resolved inventory deductions for Step 4

    if (items && items.length > 0) {
      for (const item of items) {
        const menuItemId = item.menu_item_id || item.item_id || item.inventory_id;
        const orderQty = item.quantity || 1;

        // Fetch recipe mapping for this menu item
        const recipeRes = await client.query(
          `SELECT mii.inventory_id, mii.quantity_required, i.item_name, i.stock_quantity
           FROM menu_item_ingredients mii
           JOIN inventory i ON mii.inventory_id = i.id
           WHERE mii.menu_item_id = $1`,
          [menuItemId]
        );

        // Fallback: If no recipe exists in junction table, check if it's a direct inventory item
        if (recipeRes.rows.length === 0) {
          const directCheck = await client.query(
            `SELECT id, item_name, stock_quantity FROM inventory WHERE id = $1 FOR UPDATE`,
            [menuItemId]
          );

          if (directCheck.rows.length === 0) {
            throw new Error(`Menu Item or Inventory #${menuItemId} does not exist.`);
          }

          if (directCheck.rows[0].stock_quantity < orderQty) {
            throw new Error(`Insufficient stock for item "${directCheck.rows[0].item_name}".`);
          }

          resolvedDeductions.push({
            inventory_id: menuItemId,
            deduct_quantity: orderQty
          });
        } else {
          // Recipe found: Validate stock for ALL required ingredients
          for (const ingredient of recipeRes.rows) {
            const totalRequired = ingredient.quantity_required * orderQty;

            // Lock row for update
            const stockCheck = await client.query(
              `SELECT stock_quantity FROM inventory WHERE id = $1 FOR UPDATE`,
              [ingredient.inventory_id]
            );

            if (stockCheck.rows[0].stock_quantity < totalRequired) {
              throw new Error(
                `Insufficient stock for ingredient "${ingredient.item_name}" required by menu item #${menuItemId}.`
              );
            }

            resolvedDeductions.push({
              inventory_id: ingredient.inventory_id,
              deduct_quantity: totalRequired
            });
          }
        }

        const basePrice = item.price || 0;
        const dynamicUnitPrice = calculateAdjustedPrice(basePrice, multiplier);
        calculatedTotal += dynamicUnitPrice * orderQty;
      }
    }

    // 3. Create master order row
    const insertOrderQuery = `
      INSERT INTO orders (status, is_held, total_amount, order_type, table_number, notes, progress_percentage)
      VALUES ($1, $2, $3, $4, $5, $6, 0)
      RETURNING master_order_id, status, is_held, total_amount, order_type, table_number, notes, created_at;
    `;

    const orderResult = await client.query(insertOrderQuery, [
      initialStatus,
      shouldHold,
      calculatedTotal,
      order_type || 'IN_HOUSE',
      table_number || null,
      notes || null
    ]);

    const createdOrder = orderResult.rows[0];

    // 4. Deduct stock across all resolved recipe ingredients
    for (const deduction of resolvedDeductions) {
      await client.query(
        `UPDATE inventory
         SET stock_quantity = stock_quantity - $1
         WHERE id = $2`,
        [deduction.deduct_quantity, deduction.inventory_id]
      );

      await client.query(
        `INSERT INTO stock_logs (inventory_id, new_quantity, change_amount, reason)
         VALUES ($1, (SELECT stock_quantity FROM inventory WHERE id = $1), $2, $3)`,
        [deduction.inventory_id, -deduction.deduct_quantity, 'Order #' + createdOrder.master_order_id]
      );
    }

    // 5. Link items to order row
    if (items && items.length > 0) {
      for (const item of items) {
        const menuItemId = item.menu_item_id || item.item_id || item.inventory_id;
        const quantity = item.quantity || 1;

        await client.query(
          `INSERT INTO order_items (master_order_id, item_id, quantity, ordered_by_user_id)
           VALUES ($1, $2, $3, $4)`,
          [createdOrder.master_order_id, menuItemId, quantity, ordered_by_user_id || 1]
        );
      }
    }

    await client.query('COMMIT');

    // Live Broadcast to Kitchen (if not held)
    const io = req.app.get('io');
    if (io && !shouldHold) {
      io.emit('new_kitchen_order', createdOrder);
    }

    return res.status(201).json({
      success: true,
      message: shouldHold
        ? "Order received and placed ON_HOLD (hidden from kitchen display)."
        : "Order received and sent to kitchen.",
      order: createdOrder,
      appliedMultiplier: multiplier
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    return res.status(400).json({ success: false, error: err.message });
  } finally {
    if (client) client.release();
  }
});

/**
 * GET /api/orders/kitchen
 * Fetch active kitchen orders (filters out held, completed, served, and cancelled orders)
 */
router.get('/kitchen', async (req, res) => {
  try {
    const kitchenOrders = await pool.query(
      `SELECT * FROM orders
       WHERE status NOT IN ('ON_HOLD', 'CANCELLED_AND_REFUNDED', 'COMPLETED', 'SERVED')
       ORDER BY created_at ASC`
    );

    return res.status(200).json({
      success: true,
      orders: kitchenOrders.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/orders/user/:userId
 * Fetch customer order history
 */
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const historyQuery = `
      SELECT o.*, 
             json_agg(
               json_build_object(
                 'item_id', oi.item_id,
                 'quantity', oi.quantity,
                 'item_name', COALESCE(i.item_name, 'Menu Item #' || oi.item_id)
               )
             ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON o.master_order_id = oi.master_order_id
      LEFT JOIN inventory i ON oi.item_id = i.id
      WHERE o.customer_id = $1
      GROUP BY o.master_order_id
      ORDER BY o.created_at DESC;
    `;

    const result = await pool.query(historyQuery, [userId]);

    return res.status(200).json({
      success: true,
      orders: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/orders/:id
 * Fetch order with items for customer/staff tracking
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const orderRes = await pool.query(
      `SELECT * FROM orders WHERE master_order_id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Order #${id} not found.` });
    }

    const itemsRes = await pool.query(
      `SELECT oi.quantity, oi.custom_instructions, oi.item_status, COALESCE(mi.name, 'Item #' || oi.item_id) AS item_name
       FROM order_items oi
       LEFT JOIN menu_items mi ON oi.item_id = mi.item_id
       WHERE oi.master_order_id = $1`,
      [id]
    );

    return res.status(200).json({
      success: true,
      order: {
        ...orderRes.rows[0],
        items: itemsRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/orders/:id/receipt
 * Generate detailed itemized receipt view for a specific order
 */
router.get('/:id/receipt', async (req, res) => {
  const { id } = req.params;

  try {
    const orderRes = await pool.query(
      `SELECT * FROM orders WHERE master_order_id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Order #${id} not found.` });
    }

    const order = orderRes.rows[0];

    const itemsRes = await pool.query(
      `SELECT oi.quantity, COALESCE(i.item_name, 'Menu Item #' || oi.item_id) AS item_name
       FROM order_items oi
       LEFT JOIN inventory i ON oi.item_id = i.id
       WHERE oi.master_order_id = $1`,
      [id]
    );

    const receipt = {
      receiptNumber: `TR-REC-${order.master_order_id.toString().padStart(6, '0')}`,
      orderId: order.master_order_id,
      tableNumber: order.table_number,
      orderType: order.order_type,
      status: order.status,
      date: order.created_at,
      items: itemsRes.rows,
      subtotal: order.total_amount,
      tax: order.tax_calculation || "0.00",
      tip: order.tip_value || "0.00",
      totalPaid: order.total_amount
    };

    return res.status(200).json({
      success: true,
      receipt
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/orders/:id/status
 * Update order status and emit real-time WebSockets
 */
router.patch('/:id/status', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen', 'waiter'), async (req, res) => {
  const { id } = req.params;
  let { status, progress_percentage } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, error: 'Status is required' });
  }

  status = status.toUpperCase();

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status '${status}'. Allowed statuses: ${VALID_STATUSES.join(', ')}`
    });
  }

  // Auto-calculate progress percentage based on workflow phase if not provided
  if (progress_percentage === undefined) {
    switch (status) {
      case 'RECEIVED': progress_percentage = 0; break;
      case 'IN_PREPARATION': progress_percentage = 35; break;
      case 'COOKING': progress_percentage = 60; break;
      case 'READY': progress_percentage = 90; break;
      case 'SERVED':
      case 'COMPLETED': progress_percentage = 100; break;
      default: progress_percentage = 0;
    }
  }

  try {
    const updateResult = await pool.query(
      `UPDATE orders
       SET status = $1, progress_percentage = $2, updated_at = NOW()
       WHERE master_order_id = $3
       RETURNING *`,
      [status, progress_percentage, id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Order #${id} not found.` });
    }

    const updatedOrder = updateResult.rows[0];

    // Emit WebSocket Events
    const io = req.app.get('io');
    if (io) {
      // 1. Target customer's order room
      io.to(`order_${id}`).emit('order_status_updated', {
        orderId: updatedOrder.master_order_id,
        status: updatedOrder.status,
        progressPercentage: updatedOrder.progress_percentage,
        updatedAt: updatedOrder.updated_at
      });

      // 2. Target kitchen displays
      io.emit('kitchen_order_updated', {
        orderId: updatedOrder.master_order_id,
        status: updatedOrder.status,
        progressPercentage: updatedOrder.progress_percentage
      });
    }

    return res.status(200).json({
      success: true,
      message: `Order #${id} status updated to '${status}'`,
      order: updatedOrder
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/orders/:id/release
 * Release an ON_HOLD order to the kitchen display
 */
router.post('/:id/release', async (req, res) => {
  const { id } = req.params;

  try {
    const releaseRes = await pool.query(
      `UPDATE orders
       SET status = 'RECEIVED', is_held = false, updated_at = NOW()
       WHERE master_order_id = $1 AND status = 'ON_HOLD'
       RETURNING *`,
      [id]
    );

    if (releaseRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Order #${id} was not found or is not currently ON_HOLD.`
      });
    }

    const releasedOrder = releaseRes.rows[0];

    // Notify kitchen via WebSockets when order is released from hold
    const io = req.app.get('io');
    if (io) {
      io.emit('new_kitchen_order', releasedOrder);
    }

    return res.status(200).json({
      success: true,
      message: `Order #${id} has been released to the kitchen!`,
      order: releasedOrder
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/orders/:id/refund
 * Process refund with progress limit checks
 */
router.post('/:id/refund', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  const { id } = req.params;
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const orderQuery = await client.query(
      `SELECT * FROM orders WHERE master_order_id = $1 FOR UPDATE`,
      [id]
    );

    if (orderQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: `Order #${id} not found.`
      });
    }

    const order = orderQuery.rows[0];
    const nonRefundableStatuses = ['IN_PREPARATION', 'COOKING', 'COMPLETED', 'SERVED'];

    if (order.progress_percentage > 30 || nonRefundableStatuses.includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Refund rejected: Order #${id} is already ${order.progress_percentage}% underway and kitchen prep has started.`
      });
    }

    const updatedOrder = await client.query(
      `UPDATE orders
       SET status = 'CANCELLED_AND_REFUNDED', is_held = false, updated_at = NOW()
       WHERE master_order_id = $1
       RETURNING *`,
      [id]
    );

    await client.query('COMMIT');

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'REFUND_ISSUED',
      entity_type: 'order',
      entity_id: parseInt(id),
      old_value: JSON.stringify({ status: order.status, progress_percentage: order.progress_percentage }),
      new_value: JSON.stringify({ status: 'CANCELLED_AND_REFUNDED' }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: `Order #${id} successfully refunded and cancelled.`,
      order: updatedOrder.rows[0]
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;