const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getSurgeMultiplier, calculateAdjustedPrice } = require('../utils/surgePricing');

// Safely handle both direct and destructured pool export patterns
const pool = db.pool || db;

// Valid order status transitions
const VALID_STATUSES = ['RECEIVED', 'IN_PREPARATION', 'COOKING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];

/**
 * POST /api/orders
 * Handle new order creation and deduct inventory
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

    // 2. Calculate dynamic order total server-side
    let calculatedTotal = 0;

    if (items && items.length > 0) {
      for (const item of items) {
        const itemId = item.item_id || item.inventory_id;
        const quantity = item.quantity;

        // Check inventory stock using valid 'stock_quantity' column
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

        const basePrice = item.price || 0;
        const dynamicUnitPrice = calculateAdjustedPrice(basePrice, multiplier);
        calculatedTotal += dynamicUnitPrice * quantity;
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

    // 4. Deduct stock and insert order items
    if (items && items.length > 0) {
      for (const item of items) {
        const itemId = item.item_id || item.inventory_id;
        const quantity = item.quantity;

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
 * Fetch customer order history (uses i.item_name)
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
                 'item_name', i.item_name
               )
             ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON o.master_order_id = oi.master_order_id
      LEFT JOIN inventory i ON oi.item_id = i.id
      WHERE oi.ordered_by_user_id = $1
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
 * GET /api/orders/:id/receipt
 * Generate detailed itemized receipt view for a specific order (uses i.item_name)
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
      `SELECT oi.quantity, i.item_name
       FROM order_items oi
       JOIN inventory i ON oi.item_id = i.id
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
router.patch('/:id/status', async (req, res) => {
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