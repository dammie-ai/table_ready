const db = require('../config/db');
const pool = db.pool || db;

/**
 * POST /api/kitchen/orders/:orderId/cook/start/:itemId
 * Start cooking an item
 */
exports.startCooking = async (req, res) => {
  try {
    await pool.query(
      'UPDATE order_items SET item_status = $1 WHERE order_item_id = $2 AND master_order_id = $3',
      ['COOKING', req.params.itemId, req.params.orderId]
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/kitchen/orders/:orderId/cook/release-held
 * Release held items
 */
exports.releaseHeldItems = async (req, res) => {
  try {
    await pool.query(
      'UPDATE order_items SET item_status = $1 WHERE master_order_id = $2 AND item_status = $3',
      ['RECEIVED', req.params.orderId, 'ON_HOLD']
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/kitchen/orders/:orderId/cook/ready/:itemId
 * Mark item as ready
 */
exports.markItemReady = async (req, res) => {
  try {
    await pool.query(
      'UPDATE order_items SET item_status = $1 WHERE order_item_id = $2 AND master_order_id = $3',
      ['READY', req.params.itemId, req.params.orderId]
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/kitchen/orders/:orderId/cook/sync-status
 * Sync order status
 */
exports.syncOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query(
      'UPDATE orders SET status = $1 WHERE master_order_id = $2',
      [status, req.params.orderId]
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/kitchen/orders/:orderId/cook-tracking
 * Get order tracking
 */
exports.getOrderTracking = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE master_order_id = $1', [req.params.orderId]);
    return res.status(200).json({ success: true, order: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/kitchen/orders/:orderId/cook/acknowledge-overdue/:itemId
 * Acknowledge overdue item
 */
exports.acknowledgeOverdue = async (req, res) => {
  try {
    await pool.query(
      'UPDATE order_items SET item_status = $1 WHERE order_item_id = $2 AND master_order_id = $3',
      ['OVERDUE_ACK', req.params.itemId, req.params.orderId]
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
