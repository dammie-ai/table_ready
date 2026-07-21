const express = require('express');
const router = express.Router();
const db = require('../config/db');

const pool = db.pool || db;

router.post('/', async (req, res) => {
  const { items, order_type, is_held, total_amount } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Order items are required.' });
  }

  const shouldHold = is_held === true || order_type === 'ORDER_FROM_HOME';
  const initialStatus = shouldHold ? 'ON_HOLD' : 'RECEIVED';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const processedItems = [];

    for (const item of items) {
      const { inventory_id, quantity } = item;

      const checkRes = await client.query(
        'SELECT id, item_name, stock_quantity, is_active FROM inventory WHERE id = $1 FOR UPDATE',
        [inventory_id]
      );

      if (checkRes.rows.length === 0) {
        throw new Error(`Inventory item #${inventory_id} not found in database.`);
      }

      const currentItem = checkRes.rows[0];

      if (!currentItem.is_active || currentItem.stock_quantity <= 0) {
        throw new Error(`Item "${currentItem.item_name}" is out of stock.`);
      }

      const newStock = Math.max(0, currentItem.stock_quantity - quantity);
      const isStillActive = newStock > 0;

      const updateRes = await client.query(
        `UPDATE inventory 
         SET stock_quantity = $1, 
             is_active = $2, 
             updated_at = NOW() 
         WHERE id = $3 
         RETURNING *;`,
        [newStock, isStillActive, inventory_id]
      );

      await client.query(
        `INSERT INTO stock_logs (inventory_id, new_quantity, change_amount, reason) 
         VALUES ($1, $2, $3, $4);`,
        [inventory_id, newStock, -quantity, `Auto-deduction for order (${initialStatus})`]
      );

      processedItems.push(updateRes.rows[0]);
    }

    // Insert order passing total_amount with 0.00 fallback
    const orderRes = await client.query(
      `INSERT INTO orders (status, is_held, order_type, total_amount, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *;`,
      [initialStatus, shouldHold, order_type || 'STANDARD', total_amount || 0.00]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: shouldHold 
        ? 'Order paid and placed ON HOLD. Hidden from kitchen until arrival.' 
        : 'Order processed and sent to kitchen.',
      order: orderRes.rows[0],
      deducted_items: processedItems,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('TRANSACTION ERROR DETAILS:', err.message);
    
    res.status(400).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;