const db = require('../config/db');
const pool = db.pool || db;
const { startCooking, releaseHeldItems, markItemReady, syncOrderItemStatuses } = require('../utils/kitchenStagger');
const { logAudit } = require('../utils/auditLogger');

exports.startCooking = async (req, res) => {
  const { orderId, itemId } = req.params;

  try {
    const result = await startCooking(parseInt(orderId), parseInt(itemId));

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message, hold_until: result.hold_until });
    }

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'KITCHEN_START_COOKING',
      entity_type: 'order_item',
      entity_id: parseInt(itemId),
      ip_address: req.ip || req.connection.remoteAddress,
    });

    return res.status(200).json({ success: true, message: result.message, tracking_id: result.tracking_id });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.releaseHeldItems = async (req, res) => {
  const { orderId } = req.params;

  try {
    const result = await releaseHeldItems(parseInt(orderId));

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'KITCHEN_RELEASE_HELD',
      entity_type: 'order',
      entity_id: parseInt(orderId),
      new_value: JSON.stringify({ released_count: result.released_count }),
      ip_address: req.ip || req.connection.remoteAddress,
    });

    return res.status(200).json({ success: true, message: `Released ${result.released_count} held items.`, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.markItemReady = async (req, res) => {
  const { orderId, itemId } = req.params;

  try {
    const result = await markItemReady(parseInt(orderId), parseInt(itemId));

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'KITCHEN_ITEM_READY',
      entity_type: 'order_item',
      entity_id: parseInt(itemId),
      ip_address: req.ip || req.connection.remoteAddress,
    });

    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.syncOrderStatus = async (req, res) => {
  const { orderId } = req.params;

  try {
    await syncOrderItemStatuses(parseInt(orderId));
    return res.status(200).json({ success: true, message: 'Order status synced.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOrderTracking = async (req, res) => {
  const { orderId } = req.params;

  try {
    const result = await pool.query(
      `SELECT ct.*, mi.name as item_name
       FROM order_cook_tracking ct
       JOIN order_items oi ON ct.order_item_id = oi.order_item_id
       JOIN menu_items mi ON oi.item_id = mi.item_id
       WHERE ct.master_order_id = $1
       ORDER BY ct.created_at ASC`,
      [orderId]
    );

    return res.status(200).json({
      success: true,
      order_id: parseInt(orderId),
      tracking: result.rows,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.acknowledgeOverdue = async (req, res) => {
  const { orderId, itemId } = req.params;

  try {
    const result = await pool.query(
      `UPDATE order_cook_tracking
       SET overdue_notified = false, updated_at = NOW()
       WHERE master_order_id = $1 AND order_item_id = $2 AND status = 'overdue'
       RETURNING tracking_id`,
      [orderId, itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Overdue tracking item not found.' });
    }

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'OVERDUE_ACKNOWLEDGED',
      entity_type: 'order_cook_tracking',
      entity_id: result.rows[0].tracking_id,
      ip_address: req.ip || req.connection.remoteAddress,
    });

    return res.status(200).json({ success: true, message: 'Overdue item acknowledged.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
