const express = require('express');
const router = express.Router();
const pool = require('../db'); // Shared DB Pool

// POST /api/inventory - Deduct stock for order items & auto-deactivate out-of-stock items
router.post('/', async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Order items are required.' 
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const processedItems = [];

    for (const item of items) {
      const { inventory_id, quantity } = item;

      // 1. Fetch current item stock with row lock
      const checkRes = await client.query(
        'SELECT id, item_name, stock_quantity, is_active FROM inventory WHERE id = $1 FOR UPDATE',
        [inventory_id]
      );

      if (checkRes.rows.length === 0) {
        throw new Error(`Inventory item #${inventory_id} not found.`);
      }

      const currentItem = checkRes.rows[0];

      if (!currentItem.is_active || currentItem.stock_quantity <= 0) {
        throw new Error(`Item "${currentItem.item_name}" is out of stock.`);
      }

      // 2. Deduct stock quantity and update status if depleted
      const newStock = Math.max(0, currentItem.stock_quantity - quantity);
      const isStillActive = newStock > 0;

      const updateRes = await client.query(
        `UPDATE inventory 
         SET stock_quantity = $1, 
             is_active = $2, 
             updated_at = NOW() 
         WHERE id = $3 
         RETURNING *`,
        [newStock, isStillActive, inventory_id]
      );

      // 3. Log deduction in stock_logs
      try {
        await client.query(
          `INSERT INTO stock_logs (inventory_id, new_quantity, reason) 
           VALUES ($1, $2, $3)`,
          [inventory_id, newStock, 'Auto-deduction for order']
        );
      } catch (logErr) {
        console.warn('Audit log skip:', logErr.message);
      }

      processedItems.push(updateRes.rows[0]);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Order processed successfully and inventory deducted.',
      deducted_items: processedItems
    });

  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(400).json({ 
      success: false, 
      error: err.message 
    });
  } finally {
    client.release();
  }
});

// GET /api/inventory - Fetch current inventory status
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY id ASC');
    res.status(200).json({ success: true, inventory: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;