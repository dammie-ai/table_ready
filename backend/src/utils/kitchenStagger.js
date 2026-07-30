const db = require('../config/db');
const pool = db.pool || db;

async function calculateStaggeredTiming(orderItems) {
  const results = [];

  for (const item of orderItems) {
    const menuItemId = item.menu_item_id || item.item_id || item.inventory_id;
    const quantity = item.quantity || 1;

    const itemRes = await pool.query(
      `SELECT mi.item_id, mi.name, mi.prep_time_minutes, mi.category_type
       FROM menu_items mi
       WHERE mi.item_id = $1 AND mi.is_active = true`,
      [menuItemId]
    );

    if (itemRes.rows.length === 0) {
      results.push({
        ...item,
        estimated_cook_minutes: 10,
        hold_until: null,
      });
      continue;
    }

    const menuItem = itemRes.rows[0];
    const baseCookTime = menuItem.prep_time_minutes;
    const quantityModifier = quantity <= 2 ? 1 : quantity <= 4 ? 1.5 : 2;
    const estimatedCookMinutes = Math.round(baseCookTime * quantityModifier);

    results.push({
      ...item,
      item_name: menuItem.name,
      estimated_cook_minutes: estimatedCookMinutes,
      hold_until: null,
    });
  }

  if (results.length === 0) {
    return results;
  }

  const maxCookTime = Math.max(...results.map((r) => r.estimated_cook_minutes));

  results.forEach((item) => {
    if (item.estimated_cook_minutes < maxCookTime) {
      const holdMinutes = maxCookTime - item.estimated_cook_minutes;
      item.hold_until = new Date(Date.now() + holdMinutes * 60 * 1000);
      item.hold_minutes = holdMinutes;
    }
  });

  return results;
}

async function syncOrderItemStatuses(masterOrderId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const trackingRes = await client.query(
      `SELECT tracking_id, order_item_id, estimated_cook_minutes, status
       FROM order_cook_tracking
       WHERE master_order_id = $1`,
      [masterOrderId]
    );

    const allReady = trackingRes.rows.every(
      (t) => t.status === 'ready' || t.status === 'held' || t.status === 'bumped'
    );

    if (allReady && trackingRes.rows.length > 0) {
      await client.query(
        `UPDATE orders
         SET progress_percentage = 90, status = 'READY', updated_at = NOW()
         WHERE master_order_id = $1`,
        [masterOrderId]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function createCookTrackingForOrder(masterOrderId, orderItemIds) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const orderItemId of orderItemIds) {
      const itemRes = await client.query(
        `SELECT oi.quantity, oi.item_id, mi.prep_time_minutes
         FROM order_items oi
         JOIN menu_items mi ON oi.item_id = mi.item_id
         WHERE oi.order_item_id = $1`,
        [orderItemId]
      );

      const quantity = itemRes.rows.length > 0 ? itemRes.rows[0].quantity : 1;
      const estimatedCookMinutes = itemRes.rows.length > 0
        ? itemRes.rows[0].prep_time_minutes * Math.max(1, Math.ceil(quantity / 2))
        : 10;

      await client.query(
        `INSERT INTO order_cook_tracking (master_order_id, order_item_id, estimated_cook_minutes, status)
         VALUES ($1, $2, $3, 'pending')`,
        [masterOrderId, orderItemId, estimatedCookMinutes]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function startCooking(masterOrderId, orderItemId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const trackingRes = await client.query(
      `SELECT tracking_id, status, held_until
       FROM order_cook_tracking
       WHERE master_order_id = $1 AND order_item_id = $2`,
      [masterOrderId, orderItemId]
    );

    if (trackingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Cook tracking not found for this order item.');
    }

    const tracking = trackingRes.rows[0];

    if (tracking.held_until && new Date() < new Date(tracking.held_until)) {
      await client.query('ROLLBACK');
      return {
        success: false,
        message: `Item is on hold until ${new Date(tracking.held_until).toLocaleTimeString()}.`,
        hold_until: tracking.held_until,
      };
    }

    await client.query(
      `UPDATE order_cook_tracking
       SET status = 'cooking', cooking_started_at = NOW(), updated_at = NOW()
       WHERE tracking_id = $1`,
      [tracking.tracking_id]
    );

    await client.query(
      `UPDATE order_items
       SET item_status = 'Preparing', updated_at = NOW()
       WHERE order_item_id = $1`,
      [orderItemId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Item marked as cooking.',
      tracking_id: tracking.tracking_id,
      status: 'cooking',
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function releaseHeldItems(masterOrderId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const now = new Date();
    const heldItems = await client.query(
      `SELECT tracking_id, order_item_id, held_until
       FROM order_cook_tracking
       WHERE master_order_id = $1 AND status = 'held' AND held_until <= $2`,
      [masterOrderId, now]
    );

    for (const item of heldItems.rows) {
      await client.query(
        `UPDATE order_cook_tracking
         SET status = 'cooking', cooking_started_at = NOW(), updated_at = NOW()
         WHERE tracking_id = $1`,
        [item.tracking_id]
      );

      await client.query(
        `UPDATE order_items
         SET item_status = 'Preparing', updated_at = NOW()
         WHERE order_item_id = $1`,
        [item.order_item_id]
      );
    }

    await client.query('COMMIT');

    return {
      success: true,
      released_count: heldItems.rows.length,
      released_items: heldItems.rows,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function markItemReady(masterOrderId, orderItemId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE order_cook_tracking
       SET status = 'ready', actual_cook_minutes = EXTRACT(EPOCH FROM (NOW() - cooking_started_at)) / 60, updated_at = NOW()
       WHERE master_order_id = $1 AND order_item_id = $2`,
      [masterOrderId, orderItemId]
    );

    await client.query(
      `UPDATE order_items
       SET item_status = 'Ready', updated_at = NOW()
       WHERE order_item_id = $1`,
      [orderItemId]
    );

    await client.query('COMMIT');

    await syncOrderItemStatuses(masterOrderId);

    return { success: true, message: 'Item marked as ready.' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  calculateStaggeredTiming,
  syncOrderItemStatuses,
  createCookTrackingForOrder,
  startCooking,
  releaseHeldItems,
  markItemReady,
};
