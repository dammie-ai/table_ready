const pool = require('../config/db');
const db = require('../config/db');
const dbPool = db.pool || db;
const { logAudit } = require('../utils/auditLogger');

exports.modifyOrderItems = async (req, res) => {
  const { orderId } = req.params;
  const { add_items, remove_items } = req.body;
  const client = await dbPool.connect();

  try {
    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM orders WHERE master_order_id = $1 FOR UPDATE', [orderId]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: `Order #${orderId} not found.` });
    }
    const order = orderRes.rows[0];
    const nonModifiableStatuses = ['COMPLETED', 'SERVED', 'CANCELLED', 'CANCELLED_AND_REFUNDED'];
    if (nonModifiableStatuses.includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: `Cannot modify order in status: ${order.status}` });
    }

    let totalAdjustment = 0;

    if (remove_items && Array.isArray(remove_items)) {
      for (const remove of remove_items) {
        const { order_item_id, quantity = 1 } = remove;
        const itemRes = await client.query('SELECT * FROM order_items WHERE order_item_id = $1 AND master_order_id = $2', [order_item_id, orderId]);
        if (itemRes.rows.length === 0) continue;
        const item = itemRes.rows[0];
        const removeQty = Math.min(quantity, item.quantity);
        if (removeQty <= 0) continue;

        const menuItemRes = await client.query('SELECT base_price, item_id FROM menu_items WHERE item_id = $1', [item.item_id]);
        const unitPrice = menuItemRes.rows.length > 0 ? parseFloat(menuItemRes.rows[0].base_price) : 0;
        totalAdjustment -= unitPrice * removeQty;

        const recipeRes = await client.query('SELECT inventory_id, quantity_required FROM menu_item_ingredients WHERE menu_item_id = $1', [item.item_id]);
        for (const ingredient of recipeRes.rows) {
          const restoreQty = ingredient.quantity_required * removeQty;
          await client.query('UPDATE inventory SET stock_quantity = stock_quantity + $1 WHERE id = $2', [restoreQty, ingredient.inventory_id]);
          await client.query('INSERT INTO stock_logs (inventory_id, new_quantity, change_amount, reason) VALUES ($1, (SELECT stock_quantity FROM inventory WHERE id = $1), $2, $3)',
            [ingredient.inventory_id, restoreQty, `Order #${orderId} item removed - stock restored`]);
        }

        if (removeQty >= item.quantity) {
          await client.query('DELETE FROM order_items WHERE order_item_id = $1', [order_item_id]);
          await client.query('DELETE FROM order_cook_tracking WHERE order_item_id = $1', [order_item_id]);
        } else {
          await client.query('UPDATE order_items SET quantity = quantity - $1 WHERE order_item_id = $2', [removeQty, order_item_id]);
        }
      }
    }

    if (add_items && Array.isArray(add_items)) {
      for (const add of add_items) {
        const { menu_item_id, inventory_id, quantity = 1, custom_instructions } = add;
        const itemId = menu_item_id || inventory_id;
        if (!itemId) continue;

        const menuItemRes = await client.query('SELECT base_price, item_id FROM menu_items WHERE item_id = $1 AND is_active = true', [itemId]);
        if (menuItemRes.rows.length === 0) continue;
        const unitPrice = parseFloat(menuItemRes.rows[0].base_price);
        totalAdjustment += unitPrice * quantity;

        const inserted = await client.query(
          'INSERT INTO order_items (master_order_id, item_id, quantity, ordered_by_user_id, custom_instructions, modifiers) VALUES ($1, $2, $3, $4, $5, $6) RETURNING order_item_id',
          [orderId, itemId, quantity, req.user?.id || null, custom_instructions || null, JSON.stringify(add.modifiers || [])]
        );
        const newOrderItemId = inserted.rows[0].order_item_id;

        const recipeRes = await client.query('SELECT inventory_id, quantity_required FROM menu_item_ingredients WHERE menu_item_id = $1', [itemId]);
        for (const ingredient of recipeRes.rows) {
          const totalRequired = ingredient.quantity_required * quantity;
          const stockCheck = await client.query('SELECT stock_quantity FROM inventory WHERE id = $1 FOR UPDATE', [ingredient.inventory_id]);
          if (stockCheck.rows[0].stock_quantity < totalRequired) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: `Insufficient stock for ingredient in item #${itemId}.` });
          }
          await client.query('UPDATE inventory SET stock_quantity = stock_quantity - $1 WHERE id = $2', [totalRequired, ingredient.inventory_id]);
          await client.query('INSERT INTO stock_logs (inventory_id, new_quantity, change_amount, reason) VALUES ($1, (SELECT stock_quantity FROM inventory WHERE id = $1), $2, $3)',
            [ingredient.inventory_id, -totalRequired, `Order #${orderId} item added - stock deducted`]);
        }

        const prepTimeRes = await client.query('SELECT prep_time_minutes FROM menu_items WHERE item_id = $1', [itemId]);
        const prepTime = prepTimeRes.rows.length > 0 ? prepTimeRes.rows[0].prep_time_minutes : 10;
        const estimatedCookMinutes = prepTime * Math.max(1, Math.ceil(quantity / 2));
        await client.query(
          'INSERT INTO order_cook_tracking (master_order_id, order_item_id, estimated_cook_minutes, status) VALUES ($1, $2, $3, $4)',
          [orderId, newOrderItemId, estimatedCookMinutes, 'pending']
        );
      }
    }

    const newTotal = parseFloat(order.total_amount) + totalAdjustment;
    await client.query('UPDATE orders SET total_amount = $1, updated_at = NOW() WHERE master_order_id = $2', [newTotal, orderId]);

    const updatedOrder = await client.query('SELECT * FROM orders WHERE master_order_id = $1', [orderId]);
    const updatedItems = await client.query(
      `SELECT oi.*, mi.name as item_name, mi.base_price FROM order_items oi LEFT JOIN menu_items mi ON oi.item_id = mi.item_id WHERE oi.master_order_id = $1`,
      [orderId]
    );

    await client.query('COMMIT');

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'ORDER_MODIFIED',
      entity_type: 'order',
      entity_id: parseInt(orderId),
      new_value: JSON.stringify({ total_adjustment: totalAdjustment, new_total: newTotal, added: add_items?.length || 0, removed: remove_items?.length || 0 }),
      ip_address: req.ip || req.connection.remoteAddress,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${orderId}`).emit('order_updated', {
        orderId: parseInt(orderId),
        total_amount: newTotal,
        items: updatedItems.rows,
        updatedAt: new Date().toISOString(),
      });
      io.emit('kitchen_order_updated', { orderId: parseInt(orderId), status: order.status });
    }

    return res.status(200).json({
      success: true,
      message: 'Order modified successfully.',
      order: updatedOrder.rows[0],
      items: updatedItems.rows,
      total_adjustment: totalAdjustment,
      new_total: newTotal,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

exports.voidItem = async (req, res) => {
  const { orderId, itemId } = req.params;
  const { reason } = req.body;
  const client = await dbPool.connect();

  try {
    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM orders WHERE master_order_id = $1 FOR UPDATE', [orderId]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: `Order #${orderId} not found.` });
    }

    const itemRes = await client.query('SELECT * FROM order_items WHERE order_item_id = $1 AND master_order_id = $2', [itemId, orderId]);
    if (itemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Order item not found.' });
    }
    const item = itemRes.rows[0];

    const menuItemRes = await client.query('SELECT base_price, name FROM menu_items WHERE item_id = $1', [item.item_id]);
    const unitPrice = menuItemRes.rows.length > 0 ? parseFloat(menuItemRes.rows[0].base_price) : 0;
    const voidAmount = unitPrice * item.quantity;

    const recipeRes = await client.query('SELECT inventory_id, quantity_required FROM menu_item_ingredients WHERE menu_item_id = $1', [item.item_id]);
    for (const ingredient of recipeRes.rows) {
      const restoreQty = ingredient.quantity_required * item.quantity;
      await client.query('UPDATE inventory SET stock_quantity = stock_quantity + $1 WHERE id = $2', [restoreQty, ingredient.inventory_id]);
      await client.query('INSERT INTO stock_logs (inventory_id, new_quantity, change_amount, reason) VALUES ($1, (SELECT stock_quantity FROM inventory WHERE id = $1), $2, $3)',
        [ingredient.inventory_id, restoreQty, `Order #${orderId} item voided - stock restored`]);
    }

    await client.query('UPDATE orders SET total_amount = total_amount - $1, updated_at = NOW() WHERE master_order_id = $2', [voidAmount, orderId]);
    await client.query('UPDATE order_items SET item_status = $1, custom_instructions = COALESCE(custom_instructions, $2) || $3 WHERE order_item_id = $4',
      ['Bumped', '', ` [VOIDED: ${reason || 'No reason'}]`, itemId]);
    await client.query('UPDATE order_cook_tracking SET status = $1 WHERE order_item_id = $2', ['bumped', itemId]);

    await client.query('COMMIT');

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'ITEM_VOIDED',
      entity_type: 'order_item',
      entity_id: parseInt(itemId),
      old_value: JSON.stringify({ price: voidAmount }),
      new_value: JSON.stringify({ reason }),
      ip_address: req.ip || req.connection.remoteAddress,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${orderId}`).emit('order_item_voided', {
        orderId: parseInt(orderId),
        orderItemId: parseInt(itemId),
        reason,
        voidAmount,
      });
    }

    return res.status(200).json({ success: true, message: 'Item voided successfully.', void_amount: voidAmount });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

exports.recordCashPayment = async (req, res) => {
  const { orderId } = req.params;
  const { amount } = req.body;

  if (!orderId || !amount || amount <= 0) {
    return res.status(400).json({ success: false, error: 'orderId and positive amount are required.' });
  }

  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM orders WHERE master_order_id = $1 FOR UPDATE', [orderId]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: `Order #${orderId} not found.` });
    }
    const order = orderRes.rows[0];

    const existingCash = await client.query('SELECT COALESCE(SUM(amount), 0) as total FROM order_payments WHERE master_order_id = $1 AND payment_method = $2 AND status = $3', [orderId, 'cash', 'succeeded']);
    const currentPaid = parseFloat(existingCash.rows[0].total);
    const newTotalPaid = currentPaid + amount;
    const orderTotal = parseFloat(order.total_amount);

    let paymentStatus = 'Pending';
    if (newTotalPaid >= orderTotal) {
      paymentStatus = 'Paid';
    } else if (newTotalPaid > 0) {
      paymentStatus = 'PartiallyPaid';
    }

    await client.query(
      'INSERT INTO order_payments (master_order_id, payment_method, amount, status, paid_by_user_id) VALUES ($1, $2, $3, $4, $5)',
      [orderId, 'cash', amount, 'succeeded', req.user?.id || null]
    );

    await client.query('UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE master_order_id = $2', [paymentStatus, orderId]);

    await client.query('COMMIT');

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'CASH_PAYMENT_RECORDED',
      entity_type: 'order',
      entity_id: parseInt(orderId),
      new_value: JSON.stringify({ amount, total_paid: newTotalPaid, payment_status: paymentStatus }),
      ip_address: req.ip || req.connection.remoteAddress,
    });

    return res.status(201).json({
      success: true,
      message: 'Cash payment recorded.',
      amount,
      total_paid: newTotalPaid,
      payment_status: paymentStatus,
      remaining_balance: Math.max(0, orderTotal - newTotalPaid),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

exports.distributeTips = async (req, res) => {
  const { orderId } = req.params;
  const { splits } = req.body;

  if (!orderId || !splits || !Array.isArray(splits) || splits.length === 0) {
    return res.status(400).json({ success: false, error: 'orderId and splits array are required.' });
  }

  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query('SELECT tip_value, total_amount FROM orders WHERE master_order_id = $1 FOR UPDATE', [orderId]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: `Order #${orderId} not found.` });
    }
    const order = orderRes.rows[0];
    const totalTip = parseFloat(order.tip_value || 0);
    if (totalTip <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'No tip to distribute on this order.' });
    }

    let allocatedCents = 0;
    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      if (i === splits.length - 1) {
        split.amount = parseFloat((totalTip - allocatedCents).toFixed(2));
      } else {
        split.amount = parseFloat((Math.floor(split.percentage / 100 * totalTip * 100) / 100).toFixed(2));
        allocatedCents += Math.round(split.amount * 100);
      }
      await client.query(
        'INSERT INTO order_payments (master_order_id, payment_method, amount, status, paid_by_user_id) VALUES ($1, $2, $3, $4, $5)',
        [orderId, 'tip', split.amount, 'succeeded', split.user_id || null]
      );
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Tips distributed successfully.',
      total_tip: totalTip,
      splits,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};
