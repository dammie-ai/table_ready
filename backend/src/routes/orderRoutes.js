const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getSurgeMultiplier, calculateAdjustedPrice } = require('../utils/surgePricing');
const { getTaxRate } = require('../services/configService');
const { logAudit } = require('../utils/auditLogger');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Safely handle both direct and destructured pool export patterns
const pool = db.pool || db;

// Valid order status transitions
const VALID_STATUSES = ['RECEIVED', 'IN_PREPARATION', 'COOKING', 'READY', 'READY_FOR_PICKUP', 'PICKED_UP', 'SERVED', 'COMPLETED', 'CANCELLED'];

/**
 * POST /api/orders
 * Handle new order creation with automatic recipe-based ingredient deduction
 */
router.post('/', validate(schemas.createOrder), async (req, res) => {
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
    const { order_type, is_held, items, table_number, notes, ordered_by_user_id, idempotency_key, payment_method = 'card' } = req.body;

    if (idempotency_key) {
      const existingOrder = await pool.query(
        `SELECT master_order_id FROM orders WHERE idempotency_key = $1 AND created_at > NOW() - INTERVAL '5 minutes'`,
        [idempotency_key]
      );

      if (existingOrder.rows.length > 0) {
        const fullOrder = await pool.query(
          `SELECT o.*,
                  json_agg(
                    json_build_object(
                      'order_item_id', oi.order_item_id,
                      'item_id', oi.item_id,
                      'quantity', oi.quantity,
                      'item_status', oi.item_status,
                      'custom_instructions', oi.custom_instructions
                    )
                  ) AS items
           FROM orders o
           LEFT JOIN order_items oi ON o.master_order_id = oi.master_order_id
           WHERE o.master_order_id = $1
           GROUP BY o.master_order_id`,
          [existingOrder.rows[0].master_order_id]
        );
        return res.status(200).json({
          success: true,
          message: 'Order already exists (idempotency key match).',
          order: fullOrder.rows[0],
        });
      }
    }

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

          if (directCheck.rows.length > 0) {
            if (directCheck.rows[0].stock_quantity < orderQty) {
              throw new Error(`Insufficient stock for item "${directCheck.rows[0].item_name}".`);
            }

            resolvedDeductions.push({
              inventory_id: menuItemId,
              deduct_quantity: orderQty
            });
          } else {
            // Not a recipe item and not a direct inventory item — fall back to the
            // menu item's own stock_quantity (the same field menuController/customer
            // Menu page use for the out-of-stock toggle).
            const menuItemCheck = await client.query(
              `SELECT item_id, name, stock_quantity, out_of_stock_flag, is_active
               FROM menu_items WHERE item_id = $1 FOR UPDATE`,
              [menuItemId]
            );

            if (menuItemCheck.rows.length === 0) {
              throw new Error(`Menu item #${menuItemId} does not exist.`);
            }

            const menuItem = menuItemCheck.rows[0];

            if (!menuItem.is_active || menuItem.out_of_stock_flag) {
              throw new Error(`Menu item "${menuItem.name}" is not currently available.`);
            }

            if (menuItem.stock_quantity < orderQty) {
              throw new Error(`Insufficient stock for item "${menuItem.name}".`);
            }

            resolvedDeductions.push({
              menu_item_id: menuItemId,
              deduct_quantity: orderQty
            });
          }
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

        // Price is always resolved server-side (never trust a client-supplied price).
        // menu_items.base_price is the source of truth when the item is a real menu
        // item; pure direct-inventory items (no menu_items row) fall back to
        // whatever price the caller sent, defaulting to 0.
        const priceRes = await client.query(
          `SELECT base_price FROM menu_items WHERE item_id = $1`,
          [menuItemId]
        );
        const basePrice = priceRes.rows.length > 0
          ? parseFloat(priceRes.rows[0].base_price)
          : (item.price || 0);
        const dynamicUnitPrice = calculateAdjustedPrice(basePrice, multiplier);

        let modifierTotal = 0;
        if (item.modifiers && item.modifiers.length > 0) {
          for (const mod of item.modifiers) {
            const modRes = await client.query(
              `SELECT price_adjustment FROM menu_modifiers WHERE modifier_id = $1 AND is_active = true`,
              [mod.modifier_id]
            );
            if (modRes.rows.length > 0) {
              const modQty = mod.quantity || 1;
              modifierTotal += parseFloat(modRes.rows[0].price_adjustment) * modQty;
            }
          }
        }

        calculatedTotal += (dynamicUnitPrice + modifierTotal) * orderQty;
      }
    }

    // 3. Create master order row
    const taxRate = await getTaxRate();
    const taxAmount = parseFloat((calculatedTotal * taxRate).toFixed(2));
    const totalWithTax = parseFloat((calculatedTotal + taxAmount).toFixed(2));

    const insertOrderQuery = `
      INSERT INTO orders (status, is_held, total_amount, order_type, table_number, notes, progress_percentage, idempotency_key, tax_calculation, payment_method, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $10)
      RETURNING master_order_id, status, is_held, total_amount, order_type, table_number, notes, created_at, payment_method, payment_status;
    `;

    const orderResult = await client.query(insertOrderQuery, [
      initialStatus,
      shouldHold,
      totalWithTax,
      order_type || 'IN_HOUSE',
      table_number || null,
      notes || null,
      idempotency_key || null,
      taxAmount,
      payment_method,
      'Pending'
    ]);

    const createdOrder = orderResult.rows[0];

    // 4. Deduct stock across all resolved recipe ingredients / direct menu items
    for (const deduction of resolvedDeductions) {
      if (deduction.menu_item_id) {
        await client.query(
          `UPDATE menu_items
           SET stock_quantity = stock_quantity - $1
           WHERE item_id = $2`,
          [deduction.deduct_quantity, deduction.menu_item_id]
        );
        continue;
      }

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

    // 5. Link items to order row and collect order_item_ids
    const insertedOrderItemIds = [];
    if (items && items.length > 0) {
      for (const item of items) {
        const menuItemId = item.menu_item_id || item.item_id || item.inventory_id;
        const quantity = item.quantity || 1;
        const itemModifiers = item.modifiers || [];

        const inserted = await client.query(
          `INSERT INTO order_items (master_order_id, item_id, quantity, ordered_by_user_id, custom_instructions, modifiers)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING order_item_id`,
          [createdOrder.master_order_id, menuItemId, quantity, ordered_by_user_id || 1, item.custom_instructions || null, JSON.stringify(itemModifiers)]
        );
        insertedOrderItemIds.push(inserted.rows[0].order_item_id);
      }
    }

    await client.query('COMMIT');

    // Create cook tracking entries for staggered timing with real order_item_ids
    if (insertedOrderItemIds.length > 0) {
      try {
        const { createCookTrackingForOrder } = require('../utils/kitchenStagger');
        await createCookTrackingForOrder(createdOrder.master_order_id, insertedOrderItemIds);
      } catch (trackingErr) {
        console.error('Cook tracking creation failed:', trackingErr.message);
      }
    }

    // Fetch complete order with items for broadcast
    const fullOrder = await pool.query(
      `SELECT o.*,
              json_agg(
                json_build_object(
                  'order_item_id', oi.order_item_id,
                  'item_id', oi.item_id,
                  'name', COALESCE(mi.name, 'Item #' || oi.item_id),
                  'quantity', oi.quantity,
                  'item_status', oi.item_status,
                  'custom_instructions', oi.custom_instructions,
                  'modifiers', oi.modifiers
                )
              ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.master_order_id = oi.master_order_id
       LEFT JOIN menu_items mi ON oi.item_id = mi.item_id
       WHERE o.master_order_id = $1
       GROUP BY o.master_order_id`,
      [createdOrder.master_order_id]
    );

    const broadcastOrder = fullOrder.rows[0];

    // Live Broadcast to Kitchen (if not held)
    const io = req.app.get('io');
    if (io && !shouldHold) {
      io.emit('new_kitchen_order', broadcastOrder);
    }

    return res.status(201).json({
      success: true,
      message: shouldHold
        ? "Order received and placed ON_HOLD (hidden from kitchen display)."
        : "Order received and sent to kitchen.",
      order: broadcastOrder,
      appliedMultiplier: multiplier
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    return res.status(400).json({ success: false, error: err.message });
  } finally {
    if (client) client.release();
  }
});


  router.get('/type-summary', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT order_type,
              COUNT(*) AS total_orders,
              SUM(CASE WHEN status NOT IN ('COMPLETED', 'CANCELLED', 'SERVED', 'CANCELLED_AND_REFUNDED', 'PICKED_UP') THEN 1 ELSE 0 END) AS active_orders,
              SUM(total_amount) AS total_revenue
       FROM orders
       GROUP BY order_type
       ORDER BY total_orders DESC`
    );

    const summary = result.rows.map((row) => ({
      order_type: row.order_type,
      total_orders: parseInt(row.total_orders),
      active_orders: parseInt(row.active_orders),
      total_revenue: parseFloat(row.total_revenue),
    }));

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orders/by-type/:order_type
// Fetch orders filtered by order type
router.get('/by-type/:order_type', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen', 'waiter'), async (req, res) => {
  const { order_type } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM orders WHERE order_type = $1 ORDER BY created_at DESC`,
      [order_type]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      orders: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orders/pickup-queue
// Fetch pending pickup orders sorted by scheduled time
router.get('/pickup-queue', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen', 'waiter'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*,
              json_agg(
                json_build_object(
                  'order_item_id', oi.order_item_id,
                  'item_id', oi.item_id,
                  'quantity', oi.quantity,
                  'item_status', oi.item_status,
                  'custom_instructions', oi.custom_instructions
                )
              ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.master_order_id = oi.master_order_id
       WHERE o.order_type = 'PICKUP'
         AND o.status NOT IN ('COMPLETED', 'CANCELLED', 'CANCELLED_AND_REFUNDED', 'PICKED_UP')
       GROUP BY o.master_order_id
       ORDER BY o.pickup_scheduled_time ASC NULLS LAST, o.created_at ASC`
    );

    const orders = result.rows.map((row) => ({
      ...row,
      items: row.items.filter((item) => item.order_item_id !== null),
    }));

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


/**
 * GET /api/orders/kitchen
 * Fetch active kitchen orders (filters out held, completed, served, and cancelled orders)
 */
  router.get('/kitchen-orders', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen', 'waiter'), async (req, res) => {
  try {
    const kitchenOrders = await pool.query(
      `SELECT o.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'order_item_id', oi.order_item_id,
                    'item_id', oi.item_id,
                    'name', COALESCE(mi.name, 'Item #' || oi.item_id),
                    'quantity', oi.quantity,
                    'item_status', oi.item_status,
                    'custom_instructions', oi.custom_instructions,
                    'modifiers', oi.modifiers
                  )
                ) FILTER (WHERE oi.order_item_id IS NOT NULL),
                '[]'
              ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.master_order_id = oi.master_order_id
       LEFT JOIN menu_items mi ON oi.item_id = mi.item_id
       WHERE o.status NOT IN ('ON_HOLD', 'CANCELLED_AND_REFUNDED', 'COMPLETED', 'SERVED')
       GROUP BY o.master_order_id
       ORDER BY o.created_at ASC`
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
  router.get('/history/:userId', authenticateToken, async (req, res) => {
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
 * Fetch order with items for customer/staff tracking (public for order lookup)
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
      `SELECT oi.quantity, oi.custom_instructions, oi.item_status, oi.modifiers, COALESCE(mi.name, 'Item #' || oi.item_id) AS name, COALESCE(mi.base_price, 0) AS base_price
       FROM order_items oi
       LEFT JOIN menu_items mi ON oi.item_id = mi.item_id
       WHERE oi.master_order_id = $1`,
      [id]
    );

    const items = itemsRes.rows.map(item => ({
      ...item,
      modifiers: typeof item.modifiers === 'string' ? JSON.parse(item.modifiers || '[]') : (item.modifiers || [])
    }));

    return res.status(200).json({
      success: true,
      order: {
        ...orderRes.rows[0],
        items
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
  * GET /api/orders/:id/receipt
  * Generate detailed itemized receipt view for a specific order (public)
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
        `SELECT oi.quantity, COALESCE(mi.name, 'Menu Item #' || oi.item_id) AS item_name, oi.custom_instructions, mi.base_price, oi.modifiers
         FROM order_items oi
         LEFT JOIN menu_items mi ON oi.item_id = mi.item_id
         WHERE oi.master_order_id = $1`,
        [id]
      );

      const receiptItems = itemsRes.rows.map(item => ({
        ...item,
        modifiers: typeof item.modifiers === 'string' ? JSON.parse(item.modifiers || '[]') : (item.modifiers || [])
      }));

      const taxRate = await require('../services/configService').getTaxRate();
      const subtotal = parseFloat(order.total_amount || 0) - parseFloat(order.tax_calculation || 0);
      const tax = parseFloat(order.tax_calculation || 0);
      const tip = parseFloat(order.tip_value || 0);
      const total = parseFloat(order.total_amount || 0) + tip;

      const receipt = {
        receiptNumber: `TR-REC-${order.master_order_id.toString().padStart(6, '0')}`,
        orderId: order.master_order_id,
        tableNumber: order.table_number,
        orderType: order.order_type,
        status: order.status,
        date: order.created_at,
        items: receiptItems.map(item => ({
          name: item.item_name,
          quantity: item.quantity,
          unit_price: parseFloat(item.base_price || 0),
          subtotal: parseFloat((item.base_price || 0) * item.quantity),
          custom_instructions: item.custom_instructions,
          modifiers: item.modifiers,
        })),
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        tax_rate: taxRate,
        tip: parseFloat(tip.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        payment_status: order.payment_status,
        stripe_charge_id: order.stripe_charge_id,
        notes: order.notes,
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
  router.post('/:id/release-hold', async (req, res) => {
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
router.post('/:id/refund', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.refundOrder), async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
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

    let stripeRefund = null;
    if (order.stripe_charge_id) {
      try {
        stripeRefund = await stripe.refunds.create({
          payment_intent: order.stripe_charge_id,
          reason: reason || 'requested_by_customer'
        });
      } catch (stripeErr) {
        await client.query('ROLLBACK');
        return res.status(500).json({
          success: false,
          error: `Stripe refund failed: ${stripeErr.message}`
        });
      }
    }

    const updatedOrder = await client.query(
      `UPDATE orders
       SET status = 'CANCELLED_AND_REFUNDED', is_held = false, updated_at = NOW()
       WHERE master_order_id = $1
       RETURNING *`,
      [id]
    );

    if (stripeRefund) {
      await client.query(
        `UPDATE order_payments
         SET status = 'refunded', stripe_payment_intent_id = $1
         WHERE master_order_id = $2 AND stripe_payment_intent_id = $3`,
        [stripeRefund.id, id, order.stripe_charge_id]
      );
    }

    const orderItems = await client.query(
      `SELECT oi.item_id, oi.quantity FROM order_items oi WHERE oi.master_order_id = $1`,
      [id]
    );

    for (const item of orderItems.rows) {
      const menuItemId = item.item_id;
      const recipeRes = await client.query(
        `SELECT inventory_id, quantity_required FROM menu_item_ingredients WHERE menu_item_id = $1`,
        [menuItemId]
      );

      if (recipeRes.rows.length > 0) {
        for (const ingredient of recipeRes.rows) {
          const totalRestore = ingredient.quantity_required * item.quantity;
          await client.query(
            `UPDATE inventory SET stock_quantity = stock_quantity + $1 WHERE id = $2`,
            [totalRestore, ingredient.inventory_id]
          );
          await client.query(
            `INSERT INTO stock_logs (inventory_id, new_quantity, change_amount, reason)
             VALUES ($1, (SELECT stock_quantity FROM inventory WHERE id = $1), $2, $3)`,
            [ingredient.inventory_id, totalRestore, `Order #${id} refunded - stock restored`]
          );
        }
      } else {
        await client.query(
          `UPDATE inventory SET stock_quantity = stock_quantity + $1 WHERE id = $2`,
          [item.quantity, menuItemId]
        );
        await client.query(
          `INSERT INTO stock_logs (inventory_id, new_quantity, change_amount, reason)
           VALUES ($1, (SELECT stock_quantity FROM inventory WHERE id = $1), $2, $3)`,
          [menuItemId, item.quantity, `Order #${id} refunded - stock restored`]
        );
      }
    }

    await client.query('COMMIT');

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'REFUND_ISSUED',
      entity_type: 'order',
      entity_id: parseInt(id),
      old_value: JSON.stringify({ status: order.status, progress_percentage: order.progress_percentage, stripe_charge_id: order.stripe_charge_id }),
      new_value: JSON.stringify({ status: 'CANCELLED_AND_REFUNDED', stripe_refund_id: stripeRefund?.id || null }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: `Order #${id} successfully refunded and cancelled.`,
      stripe_refund: stripeRefund ? {
        id: stripeRefund.id,
        status: stripeRefund.status,
        amount: stripeRefund.amount
      } : null,
      order: updatedOrder.rows[0]
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (client) client.release();
  }
});

/**
 * PATCH /api/orders/:id/cancel
 * Cancel an order without refund
 */
router.patch('/:id/cancel', async (req, res) => {
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
      return res.status(404).json({ success: false, error: `Order #${id} not found.` });
    }

    const order = orderQuery.rows[0];
    const nonCancellableStatuses = ['IN_PREPARATION', 'COOKING', 'COMPLETED', 'SERVED', 'CANCELLED_AND_REFUNDED'];

    if (nonCancellableStatuses.includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Cannot cancel order #${id}: status is already ${order.status}.`
      });
    }

    const updatedOrder = await client.query(
      `UPDATE orders
       SET status = 'CANCELLED', is_held = false, updated_at = NOW()
       WHERE master_order_id = $1
       RETURNING *`,
      [id]
    );

    const orderItems = await client.query(
      `SELECT oi.item_id, oi.quantity FROM order_items oi WHERE oi.master_order_id = $1`,
      [id]
    );

    for (const item of orderItems.rows) {
      const menuItemId = item.item_id;
      const recipeRes = await client.query(
        `SELECT inventory_id, quantity_required FROM menu_item_ingredients WHERE menu_item_id = $1`,
        [menuItemId]
      );

      if (recipeRes.rows.length > 0) {
        for (const ingredient of recipeRes.rows) {
          const totalRestore = ingredient.quantity_required * item.quantity;
          await client.query(
            `UPDATE inventory SET stock_quantity = stock_quantity + $1 WHERE id = $2`,
            [totalRestore, ingredient.inventory_id]
          );
          await client.query(
            `INSERT INTO stock_logs (inventory_id, new_quantity, change_amount, reason)
             VALUES ($1, (SELECT stock_quantity FROM inventory WHERE id = $1), $2, $3)`,
            [ingredient.inventory_id, totalRestore, `Order #${id} cancelled - stock restored`]
          );
        }
      } else {
        await client.query(
          `UPDATE inventory SET stock_quantity = stock_quantity + $1 WHERE id = $2`,
          [item.quantity, menuItemId]
        );
        await client.query(
          `INSERT INTO stock_logs (inventory_id, new_quantity, change_amount, reason)
           VALUES ($1, (SELECT stock_quantity FROM inventory WHERE id = $1), $2, $3)`,
          [menuItemId, item.quantity, `Order #${id} cancelled - stock restored`]
        );
      }
    }

    await client.query('COMMIT');

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'ORDER_CANCELLED',
      entity_type: 'order',
      entity_id: parseInt(id),
      old_value: JSON.stringify({ status: order.status }),
      new_value: JSON.stringify({ status: 'CANCELLED' }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: `Order #${id} cancelled.`,
      order: updatedOrder.rows[0]
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (client) client.release();
  }
});

// POST /api/orders/:id/customer-arrived
// Customer marks themselves as arrived at the restaurant
router.post('/:id/customer-arrived', async (req, res) => {
  const { id } = req.params;
  const { vehicle, curbside_lane } = req.body;

  try {
    const orderRes = await pool.query(
      `SELECT * FROM orders WHERE master_order_id = $1 AND order_type = 'PICKUP'`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Pickup order not found.' });
    }

    const updated = await pool.query(
      `UPDATE orders
       SET pickup_actual_time = NOW(),
           customer_vehicle = COALESCE($1, customer_vehicle),
           curbside_lane = COALESCE($2, curbside_lane),
           order_held_until_arrival = false,
           updated_at = NOW()
       WHERE master_order_id = $3
       RETURNING *`,
      [vehicle || null, curbside_lane || null, id]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${id}`).emit('customer_arrived', {
        orderId: parseInt(id),
        vehicle: updated.rows[0].customer_vehicle,
        curbside_lane: updated.rows[0].curbside_lane,
        arrived_at: updated.rows[0].pickup_actual_time,
      });
      io.to('kitchen').emit('pickup_customer_arrived', {
        orderId: parseInt(id),
        message: `Customer for order #${id} has arrived.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Arrival confirmed. Kitchen has been notified.',
      order: updated.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/orders/:id/mark-ready-pickup
// Kitchen marks a pickup order as ready for collection
router.post('/:id/mark-ready-pickup', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), async (req, res) => {
  const { id } = req.params;
  const { pickup_code } = req.body;

  try {
    const orderRes = await pool.query(
      `SELECT * FROM orders WHERE master_order_id = $1 AND order_type = 'PICKUP'`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Pickup order not found.' });
    }

    const code = pickup_code || Math.floor(100000 + Math.random() * 900000).toString();

    const updated = await pool.query(
      `UPDATE orders
       SET status = 'READY_FOR_PICKUP',
           pickup_code = $1,
           pickup_notified = true,
           progress_percentage = 100,
           updated_at = NOW()
       WHERE master_order_id = $2
       RETURNING *`,
      [code, id]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${id}`).emit('order_ready_for_pickup', {
        orderId: parseInt(id),
        pickup_code: code,
        message: `Your order is ready for pickup! Your pickup code is: ${code}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Order marked as ready for pickup.',
      order: updated.rows[0],
      pickup_code: code,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/orders/:id/complete-pickup
// Staff confirms customer has collected the order
router.post('/:id/complete-pickup', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen', 'waiter'), async (req, res) => {
  const { id } = req.params;

  try {
    const orderRes = await pool.query(
      `SELECT * FROM orders WHERE master_order_id = $1 AND order_type = 'PICKUP'`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Pickup order not found.' });
    }

    const updated = await pool.query(
      `UPDATE orders
       SET status = 'PICKED_UP',
           pickup_actual_time = COALESCE(pickup_actual_time, NOW()),
           progress_percentage = 100,
           updated_at = NOW()
       WHERE master_order_id = $1
       RETURNING *`,
      [id]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${id}`).emit('order_picked_up', {
        orderId: parseInt(id),
        message: `Order #${id} has been picked up.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Pickup completed successfully.',
      order: updated.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
