const db = require('../config/db');
const pool = db.pool || db;
const { logAudit } = require('../utils/auditLogger');
const { getSurgeMultiplier, calculateAdjustedPrice } = require('../utils/surgePricing');
const { getTaxRate } = require('../services/configService');
const { isWithinDeliveryRadius } = require('../utils/distance');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * POST /api/cart
 * Create a new cart (guest or customer)
 */
exports.createCart = async (req, res) => {
  const { customer_id, session_token } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO carts (customer_id, session_token, status)
       VALUES ($1, $2, 'active')
       RETURNING *`,
      [customer_id || null, session_token || null]
    );

    return res.status(201).json({
      success: true,
      cart: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/cart/:id
 * Fetch cart with items and totals
 */
exports.getCart = async (req, res) => {
  const { id } = req.params;

  try {
    const cartRes = await pool.query(`SELECT * FROM carts WHERE cart_id = $1`, [id]);

    if (cartRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cart not found.' });
    }

    const itemsRes = await pool.query(
      `SELECT ci.*, mi.name as menu_item_name, mi.image_url, i.item_name as inventory_name
       FROM cart_items ci
       LEFT JOIN menu_items mi ON ci.menu_item_id = mi.item_id
       LEFT JOIN inventory i ON ci.inventory_id = i.id
       WHERE ci.cart_id = $1
       ORDER BY ci.created_at ASC`,
      [id]
    );

    const cart = cartRes.rows[0];
    const items = itemsRes.rows.map(item => ({
      ...item,
      modifiers: typeof item.modifiers === 'string' ? JSON.parse(item.modifiers || '[]') : (item.modifiers || [])
    }));

    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.unit_price) * item.quantity), 0);

    return res.status(200).json({
      success: true,
      cart: {
        ...cart,
        items,
        subtotal: parseFloat(subtotal.toFixed(2)),
        item_count: items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/cart/:id/items
 * Add item to cart
 */
exports.addCartItem = async (req, res) => {
  const { id } = req.params;
  const { menu_item_id, inventory_id, quantity = 1, custom_instructions, modifiers } = req.body;

  if ((!menu_item_id && !inventory_id) || !quantity || quantity <= 0) {
    return res.status(400).json({
      success: false,
      error: 'menu_item_id or inventory_id and a positive quantity are required.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const cartRes = await client.query(`SELECT * FROM carts WHERE cart_id = $1 FOR UPDATE`, [id]);
    if (cartRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Cart not found.' });
    }

    if (cartRes.rows[0].status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Cart is not active.' });
    }

    let unitPrice = 0;
    let targetId = menu_item_id || inventory_id;

    if (menu_item_id) {
      const itemRes = await client.query(
        `SELECT base_price FROM menu_items WHERE item_id = $1 AND is_active = true`,
        [menu_item_id]
      );
      if (itemRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Menu item not found or inactive.' });
      }
      const multiplier = await getSurgeMultiplier();
      unitPrice = calculateAdjustedPrice(itemRes.rows[0].base_price, multiplier);

      if (modifiers && modifiers.length > 0) {
        for (const mod of modifiers) {
          const modRes = await client.query(
            `SELECT price_adjustment FROM menu_modifiers WHERE modifier_id = $1 AND is_active = true`,
            [mod.modifier_id]
          );
          if (modRes.rows.length > 0) {
            const modQty = mod.quantity || 1;
            unitPrice += parseFloat(modRes.rows[0].price_adjustment) * modQty;
          }
        }
      }
    } else if (inventory_id) {
      const itemRes = await client.query(
        `SELECT base_price, stock_quantity FROM inventory WHERE id = $1 AND is_active = true`,
        [inventory_id]
      );
      if (itemRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Inventory item not found or inactive.' });
      }
      if (itemRes.rows[0].stock_quantity < quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'Insufficient stock.' });
      }
      const multiplier = await getSurgeMultiplier();
      unitPrice = calculateAdjustedPrice(itemRes.rows[0].base_price, multiplier);
    }

    const existingRes = await client.query(
      `SELECT cart_item_id, quantity FROM cart_items
       WHERE cart_id = $1 AND menu_item_id = $2 AND inventory_id = $3 AND (custom_instructions IS NOT DISTINCT FROM $4)`,
      [id, menu_item_id || null, inventory_id || null, custom_instructions || null]
    );

    if (existingRes.rows.length > 0) {
      const newQty = existingRes.rows[0].quantity + quantity;
      await client.query(
        `UPDATE cart_items SET quantity = $1, unit_price = $2, modifiers = $3, updated_at = NOW()
         WHERE cart_item_id = $4`,
        [newQty, unitPrice, JSON.stringify(modifiers || []), existingRes.rows[0].cart_item_id]
      );
    } else {
      await client.query(
        `INSERT INTO cart_items (cart_id, menu_item_id, inventory_id, quantity, custom_instructions, unit_price, modifiers)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, menu_item_id || null, inventory_id || null, quantity, custom_instructions || null, unitPrice, JSON.stringify(modifiers || [])]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Item added to cart.',
      unit_price: unitPrice
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/cart/:id/items/:itemId
 * Remove item from cart
 */
exports.removeCartItem = async (req, res) => {
  const { id, itemId } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM cart_items WHERE cart_item_id = $1 AND cart_id = $2 RETURNING *`,
      [itemId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cart item not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Item removed from cart.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /api/cart/:id
 * Clear/abandon cart
 */
exports.clearCart = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(`DELETE FROM cart_items WHERE cart_id = $1`, [id]);
    await pool.query(`UPDATE carts SET status = 'abandoned', updated_at = NOW() WHERE cart_id = $1`, [id]);

    return res.status(200).json({
      success: true,
      message: 'Cart cleared.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/cart/:id/checkout
 * Convert cart to an order
 */
exports.checkout = async (req, res) => {
  const { id } = req.params;
  const { order_type, table_number, notes, ordered_by_user_id, latitude, longitude, idempotency_key } = req.body;

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

  // Geofencing: enforce 10-mile radius for delivery orders
  if (order_type === 'delivery') {
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Delivery orders require latitude and longitude coordinates.' });
    }

    const radiusCheck = isWithinDeliveryRadius(latitude, longitude);
    if (!radiusCheck.isAllowed) {
      return res.status(400).json({
        success: false,
        error: `Delivery unavailable. Your location is ${radiusCheck.distanceMiles} miles away (Maximum allowed delivery radius is 10 miles).`
      });
    }
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const cartRes = await client.query(`SELECT * FROM carts WHERE cart_id = $1 FOR UPDATE`, [id]);
    if (cartRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Cart not found.' });
    }

    const itemsRes = await client.query(
      `SELECT * FROM cart_items WHERE cart_id = $1`,
      [id]
    );

    if (itemsRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Cart is empty.' });
    }

    const multiplier = await getSurgeMultiplier();
    let calculatedTotal = 0;
    const resolvedDeductions = [];

    for (const item of itemsRes.rows) {
      const orderQty = item.quantity;
      const menuItemId = item.menu_item_id || item.inventory_id;

      const recipeRes = await client.query(
        `SELECT mii.inventory_id, mii.quantity_required, i.item_name, i.stock_quantity
         FROM menu_item_ingredients mii
         JOIN inventory i ON mii.inventory_id = i.id
         WHERE mii.menu_item_id = $1`,
        [menuItemId]
      );

      if (recipeRes.rows.length === 0) {
        const directCheck = await client.query(
          `SELECT id, item_name, stock_quantity FROM inventory WHERE id = $1 FOR UPDATE`,
          [menuItemId]
        );

        if (directCheck.rows.length === 0) {
          throw new Error(`Item #${menuItemId} does not exist.`);
        }

        if (directCheck.rows[0].stock_quantity < orderQty) {
          throw new Error(`Insufficient stock for "${directCheck.rows[0].item_name}".`);
        }

        resolvedDeductions.push({
          inventory_id: menuItemId,
          deduct_quantity: orderQty
        });
      } else {
        for (const ingredient of recipeRes.rows) {
          const totalRequired = ingredient.quantity_required * orderQty;

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

      calculatedTotal += parseFloat(item.unit_price) * orderQty;
    }

    const initialStatus = 'RECEIVED';

    const taxRate = await getTaxRate();
    const taxAmount = parseFloat((calculatedTotal * taxRate).toFixed(2));
    const totalWithTax = parseFloat((calculatedTotal + taxAmount).toFixed(2));

    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, status, is_held, total_amount, order_type, table_number, notes, progress_percentage, idempotency_key, tax_calculation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9)
       RETURNING master_order_id, status, is_held, total_amount, order_type, table_number, notes, created_at`,
      [cartRes.rows[0].customer_id, initialStatus, false, totalWithTax, order_type || 'IN_HOUSE', table_number || null, notes || null, idempotency_key || null, taxAmount]
    );

    const createdOrder = orderResult.rows[0];

    const insertedOrderItemIds = [];
    for (const item of itemsRes.rows) {
      const menuItemId = item.menu_item_id || item.inventory_id;
      const itemModifiers = typeof item.modifiers === 'string' ? JSON.parse(item.modifiers || '[]') : (item.modifiers || []);
      const inserted = await client.query(
        `INSERT INTO order_items (master_order_id, item_id, quantity, ordered_by_user_id, custom_instructions, modifiers)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING order_item_id`,
        [createdOrder.master_order_id, menuItemId, item.quantity, ordered_by_user_id || null, item.custom_instructions || null, JSON.stringify(itemModifiers)]
      );
      insertedOrderItemIds.push(inserted.rows[0].order_item_id);
    }

    for (const deduction of resolvedDeductions) {
      await client.query(
        `UPDATE inventory SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
        [deduction.deduct_quantity, deduction.inventory_id]
      );

      await client.query(
        `INSERT INTO stock_logs (inventory_id, new_quantity, change_amount, reason)
         VALUES ($1, (SELECT stock_quantity FROM inventory WHERE id = $1), $2, $3)`,
        [deduction.inventory_id, -deduction.deduct_quantity, 'Order #' + createdOrder.master_order_id]
      );
    }

    await client.query(`UPDATE carts SET status = 'checked_out', updated_at = NOW() WHERE cart_id = $1`, [id]);

    await client.query('COMMIT');

    if (insertedOrderItemIds.length > 0) {
      try {
        const { createCookTrackingForOrder } = require('../utils/kitchenStagger');
        await createCookTrackingForOrder(createdOrder.master_order_id, insertedOrderItemIds);
      } catch (trackingErr) {
        console.error('Cook tracking creation failed:', trackingErr.message);
      }
    }

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
      [createdOrder.master_order_id]
    );

    const broadcastOrder = fullOrder.rows[0];

    const io = req.app.get('io');
    if (io) {
      io.emit('new_kitchen_order', broadcastOrder);
    }

    let paymentIntent = null;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(calculatedTotal * 100),
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        },
        metadata: {
          order_id: createdOrder.master_order_id.toString(),
          cart_id: id
        }
      });
    } catch (stripeErr) {
      console.error('Stripe PaymentIntent creation failed:', stripeErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      order: createdOrder,
      appliedMultiplier: multiplier,
      paymentIntent: paymentIntent ? {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      } : null
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(400).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};
