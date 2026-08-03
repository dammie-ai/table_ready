const db = require('../config/db');
const pool = db.pool || db;

/**
 * POST /api/delivery/assign
 * Assign driver to order
 */
exports.assignDriver = async (req, res) => {
  try {
    const { orderId, driverId } = req.body;
    await pool.query('UPDATE orders SET driver_id = $1 WHERE master_order_id = $2', [driverId, orderId]);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/delivery/:orderId/status
 * Update delivery status
 */
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE orders SET delivery_status = $1 WHERE master_order_id = $2', [status, req.params.orderId]);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/delivery/:orderId/location
 * Update driver location
 */
exports.updateDriverLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    await pool.query(
      'UPDATE orders SET driver_latitude = $1, driver_longitude = $2 WHERE master_order_id = $3',
      [latitude, longitude, req.params.orderId]
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/delivery/history
 * Get delivery history
 */
exports.getDeliveryHistory = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE order_type = $1 ORDER BY created_at DESC',
      ['DELIVERY']
    );
    return res.status(200).json({ success: true, orders: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
