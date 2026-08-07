const db = require('../config/db');
const pool = db.pool || db;
const { calculateDistanceInMiles } = require('../utils/distance');

const AVG_DELIVERY_MPH = 20;

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
    const { orderId } = req.params;

    const updated = await pool.query(
      `UPDATE orders SET driver_latitude = $1, driver_longitude = $2 WHERE master_order_id = $3
       RETURNING delivery_latitude, delivery_longitude`,
      [latitude, longitude, orderId]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const { delivery_latitude, delivery_longitude } = updated.rows[0];
    let tracking = { driver_latitude: latitude, driver_longitude: longitude, distance_miles: null, eta_minutes: null };

    if (delivery_latitude != null && delivery_longitude != null) {
      const distanceMiles = calculateDistanceInMiles(
        latitude, longitude,
        parseFloat(delivery_latitude), parseFloat(delivery_longitude)
      );
      tracking.distance_miles = parseFloat(distanceMiles.toFixed(2));
      tracking.eta_minutes = Math.max(1, Math.round((distanceMiles / AVG_DELIVERY_MPH) * 60));
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${orderId}`).emit('delivery_location_updated', { orderId: parseInt(orderId), ...tracking });
    }

    return res.status(200).json({ success: true, ...tracking });
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
