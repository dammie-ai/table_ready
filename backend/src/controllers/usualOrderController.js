const db = require('../config/db');
const pool = db.pool || db;

/**
 * GET /api/customer/usual
 * Get customer's most frequently ordered combo by session_token (guest-friendly)
 */
exports.getTheUsualBySession = async (req, res) => {
  const { session_token } = req.query;

  if (!session_token) {
    return res.status(400).json({ success: false, error: 'session_token is required for guest access.' });
  }

  try {
    const sessionRes = await pool.query(
      `SELECT customer_id FROM customer_sessions WHERE session_token = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [session_token]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired session.' });
    }

    const customerId = sessionRes.rows[0].customer_id;

    if (!customerId) {
      return res.status(404).json({ success: false, error: 'No customer profile linked to this session.' });
    }

    return await exports.getTheUsual({ params: { customerId } }, res);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/customer/usual/reorder
 * One-tap reorder by session_token (guest-friendly)
 */
exports.reorderTheUsualBySession = async (req, res) => {
  const { session_token, order_type, table_number, ordered_by_user_id } = req.body;

  if (!session_token) {
    return res.status(400).json({ success: false, error: 'session_token is required for guest access.' });
  }

  try {
    const sessionRes = await pool.query(
      `SELECT customer_id FROM customer_sessions WHERE session_token = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [session_token]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired session.' });
    }

    const customerId = sessionRes.rows[0].customer_id;

    if (!customerId) {
      return res.status(404).json({ success: false, error: 'No customer profile linked to this session.' });
    }

    return await exports.reorderTheUsual({ params: { customerId }, body: { order_type, table_number, ordered_by_user_id, cart_id: req.body.cart_id }, app: req.app }, res);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/customer/usual
 * Update/create customer's usual combo by session_token (guest-friendly)
 */
exports.setTheUsualBySession = async (req, res) => {
  const { session_token, item_ids, quantities, combo_name } = req.body;

  if (!session_token) {
    return res.status(400).json({ success: false, error: 'session_token is required for guest access.' });
  }

  try {
    const sessionRes = await pool.query(
      `SELECT customer_id FROM customer_sessions WHERE session_token = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [session_token]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired session.' });
    }

    const customerId = sessionRes.rows[0].customer_id;

    if (!customerId) {
      return res.status(404).json({ success: false, error: 'No customer profile linked to this session.' });
    }

    return await exports.setTheUsual({ params: { customerId }, body: { item_ids, quantities, combo_name } }, res);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/customer/:customerId/usual
 * Get customer's most frequently ordered combo ("The Usual")
 */
exports.getTheUsual = async (req, res) => {
  const { customerId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM customer_favorite_combos WHERE customer_id = $1 ORDER BY last_ordered_at DESC LIMIT 1`,
      [customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No usual order found for this customer.' });
    }

    const combo = result.rows[0];
    const itemIds = combo.item_ids;
    const quantities = combo.quantities;

    const items = [];
    for (let i = 0; i < itemIds.length; i++) {
      const itemId = itemIds[i];
      const qty = quantities[i];

      const itemRes = await pool.query(
        `SELECT item_id, name, base_price, image_url FROM menu_items WHERE item_id = $1 AND is_active = true`,
        [itemId]
      );

      if (itemRes.rows.length > 0) {
        items.push({
          ...itemRes.rows[0],
          quantity: qty,
          base_price: parseFloat(itemRes.rows[0].base_price)
        });
      }
    }

    return res.status(200).json({
      success: true,
      usual: {
        combo_id: combo.combo_id,
        combo_name: combo.combo_name,
        items,
        order_count: combo.order_count,
        last_ordered_at: combo.last_ordered_at
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/customer/:customerId/usual/reorder
 * One-tap reorder of "The Usual"
 */
exports.reorderTheUsual = async (req, res) => {
  const { customerId } = req.params;
  const { order_type, table_number, ordered_by_user_id } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const comboRes = await client.query(
      `SELECT * FROM customer_favorite_combos WHERE customer_id = $1 ORDER BY last_ordered_at DESC LIMIT 1`,
      [customerId]
    );

    if (comboRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'No usual order found.' });
    }

    const combo = comboRes.rows[0];
    const itemIds = combo.item_ids;
    const quantities = combo.quantities;

    const multiplier = await require('../utils/surgePricing').getSurgeMultiplier();
    let calculatedTotal = 0;
    const resolvedDeductions = [];

    for (let i = 0; i < itemIds.length; i++) {
      const menuItemId = itemIds[i];
      const orderQty = quantities[i];

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

      const itemPriceRes = await client.query(
        `SELECT base_price FROM menu_items WHERE item_id = $1`,
        [menuItemId]
      );

      const basePrice = parseFloat(itemPriceRes.rows[0]?.base_price || 0);
      const dynamicUnitPrice = require('../utils/surgePricing').calculateAdjustedPrice(basePrice, multiplier);
      calculatedTotal += dynamicUnitPrice * orderQty;
    }

    const initialStatus = 'RECEIVED';
    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, status, is_held, total_amount, order_type, table_number, progress_percentage)
       VALUES ($1, $2, false, $3, $4, $5, 0)
       RETURNING master_order_id, status, is_held, total_amount, order_type, table_number, created_at`,
      [customerId, initialStatus, calculatedTotal, order_type || 'IN_HOUSE', table_number || null]
    );

    const createdOrder = orderResult.rows[0];

    for (let i = 0; i < itemIds.length; i++) {
      const menuItemId = itemIds[i];
      const qty = quantities[i];

      await client.query(
        `INSERT INTO order_items (master_order_id, item_id, quantity, ordered_by_user_id)
         VALUES ($1, $2, $3, $4)`,
        [createdOrder.master_order_id, menuItemId, qty, ordered_by_user_id || null]
      );
    }

    for (const deduction of resolvedDeductions) {
      await client.query(
        `UPDATE inventory SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
        [deduction.deduct_quantity, deduction.inventory_id]
      );

      await client.query(
        `INSERT INTO stock_logs (inventory_id, new_quantity, change_amount, reason)
         VALUES ($1, (SELECT stock_quantity FROM inventory WHERE id = $1), $2, $3)`,
        [deduction.inventory_id, -deduction.deduct_quantity, 'The Usual Reorder #' + createdOrder.master_order_id]
      );
    }

    await client.query(
      `UPDATE customer_favorite_combos SET order_count = order_count + 1, last_ordered_at = NOW() WHERE combo_id = $1`,
      [combo.combo_id]
    );

    await client.query(`UPDATE carts SET status = 'checked_out', updated_at = NOW() WHERE cart_id = $1`, [req.body.cart_id]);

    await client.query('COMMIT');

    const io = req.app.get('io');
    if (io) {
      io.emit('new_kitchen_order', createdOrder);
    }

    return res.status(201).json({
      success: true,
      message: 'The Usual reordered successfully.',
      order: createdOrder,
      appliedMultiplier: multiplier
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(400).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

/**
 * POST /api/customer/:customerId/usual
 * Update/create customer's usual combo
 */
exports.setTheUsual = async (req, res) => {
  const { customerId } = req.params;
  const { item_ids, quantities, combo_name } = req.body;

  if (!item_ids || !quantities || item_ids.length !== quantities.length) {
    return res.status(400).json({ success: false, error: 'item_ids and quantities arrays must match in length.' });
  }

  try {
    const existing = await pool.query(
      `SELECT combo_id FROM customer_favorite_combos WHERE customer_id = $1 AND combo_name = $2`,
      [customerId, combo_name || 'The Usual']
    );

    if (existing.rows.length > 0) {
      const result = await pool.query(
        `UPDATE customer_favorite_combos SET item_ids = $1, quantities = $2, updated_at = NOW()
         WHERE combo_id = $3
         RETURNING *`,
        [JSON.stringify(item_ids), JSON.stringify(quantities), existing.rows[0].combo_id]
      );
      return res.status(200).json({ success: true, message: 'The Usual updated successfully.', combo: result.rows[0] });
    } else {
      const result = await pool.query(
        `INSERT INTO customer_favorite_combos (customer_id, item_ids, quantities, combo_name)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [customerId, JSON.stringify(item_ids), JSON.stringify(quantities), combo_name || 'The Usual']
      );
      return res.status(201).json({ success: true, message: 'The Usual created successfully.', combo: result.rows[0] });
    }

    return res.status(200).json({
      success: true,
      message: 'The Usual updated successfully.',
      combo: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
