const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Safely handle both direct and destructured pool export patterns
const pool = db.pool || db;

// Handle new order creation and deduct inventory
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
    const { order_type, is_held, items, total_amount, table_number, notes, ordered_by_user_id } = req.body;

    // Automatically hold the order if placed from home or explicitly flagged as held
    const shouldHold = is_held === true || order_type === 'ORDER_FROM_HOME';
    const initialStatus = shouldHold ? 'ON_HOLD' : 'RECEIVED';

    await client.query('BEGIN');

    // Create master order row
    const insertOrderQuery = `
      INSERT INTO orders (status, is_held, total_amount, order_type, table_number, notes, progress_percentage)
      VALUES ($1, $2, $3, $4, $5, $6, 0)
      RETURNING master_order_id, status, is_held, total_amount, order_type, table_number, notes, created_at;
    `;
    
    const orderResult = await client.query(insertOrderQuery, [
      initialStatus,
      shouldHold,
      total_amount,
      order_type || 'IN_HOUSE',
      table_number || null,
      notes || null
    ]);

    const createdOrder = orderResult.rows[0];

    // Check stock and deduct inventory for ordered items
    if (items && items.length > 0) {
      for (const item of items) {
        // Accept inventory_id or item_id from request body
        const itemId = item.item_id || item.inventory_id;
        const { quantity } = item;

        // Lock row using 'id' and check 'stock_quantity'
        const stockCheck = await client.query(
          `SELECT stock_quantity FROM inventory WHERE id = $1 FOR UPDATE`,
          [itemId]
        );

        if (stockCheck.rows.length === 0) {
          throw new Error(`Inventory item #${itemId} does not exist.`);
        }

        if (stockCheck.rows[0].stock_quantity < quantity) {
          throw new Error(`Insufficient stock for inventory item #${itemId}.`);
        }

        // Deduct stock using 'stock_quantity' and 'id'
        await client.query(
          `UPDATE inventory 
           SET stock_quantity = stock_quantity - $1 
           WHERE id = $2`,
          [quantity, itemId]
        );

        // Link item to order using 'item_id' and 'ordered_by_user_id'
        await client.query(
          `INSERT INTO order_items (master_order_id, item_id, quantity, ordered_by_user_id)
           VALUES ($1, $2, $3, $4)`,
          [createdOrder.master_order_id, itemId, quantity, ordered_by_user_id || 1]
        );
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: shouldHold 
        ? "Order received and placed ON_HOLD (hidden from kitchen display)." 
        : "Order received and sent to kitchen.",
      order: createdOrder
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    return res.status(400).json({ success: false, error: err.message });
  } finally {
    if (client) client.release();
  }
});

// Fetch active kitchen orders (filters out held, completed, served, and cancelled orders)
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

// Release an ON_HOLD order to the kitchen display
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

    return res.status(200).json({
      success: true,
      message: `Order #${id} has been released to the kitchen!`,
      order: releaseRes.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Process refund with progress limit checks
router.post('/:id/refund', async (req, res) => {
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