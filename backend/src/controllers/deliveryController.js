const db = require('../config/db');
const pool = db.pool || db;
const { calculateDistanceInMiles } = require('../utils/distance');

const AVG_DELIVERY_MPH = 20;

/**
 * GET /api/delivery/drivers
 * List delivery-role staff, for the assign-driver dropdown — no roster
 * endpoint of any kind existed anywhere in the backend before this.
 */
exports.getDrivers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username FROM users WHERE role = 'delivery' ORDER BY username ASC`
    );
    return res.status(200).json({ success: true, drivers: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/delivery/assign
 * Assign a driver to an order via order_assignments — orders.driver_id
 * doesn't exist as a column, and req.body.orderId/driverId never matched
 * the validated order_id/driver_id fields, so this previously either threw
 * or silently no-opped on every call; nothing ever populated
 * order_assignments, which getDeliveryDashboard's "my deliveries" query
 * has depended on reading all along.
 */
exports.assignDriver = async (req, res) => {
  const { order_id, driver_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Superseding any prior active assignment (rather than a unique
    // constraint + upsert) keeps a real history and lets a manager
    // reassign a delivery without a schema change.
    await client.query(
      `UPDATE order_assignments SET status = 'cancelled', updated_at = NOW()
       WHERE order_id = $1 AND status NOT IN ('delivered', 'cancelled')`,
      [order_id]
    );

    const result = await client.query(
      `INSERT INTO order_assignments (order_id, assigned_to, assigned_by, status)
       VALUES ($1, $2, $3, 'assigned')
       RETURNING assignment_id, order_id, assigned_to, status`,
      [order_id, driver_id, req.user.id]
    );

    await client.query('COMMIT');

    const io = req.app.get('io');
    if (io) {
      io.emit('delivery_assigned', { order_id, driver_id });
    }

    return res.status(200).json({ success: true, assignment: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

/**
 * POST /api/delivery/:orderId/status
 * Update delivery status. Marking 'delivered' only closes out the order's
 * main status (and unlocks the customer's "Completed" screen) if payment
 * is already settled (e.g. paid by card at checkout) -- a cash-on-delivery
 * order stays open until the driver records the cash payment via
 * recordCashPayment, same rule as the dine-in waiter flow.
 */
exports.updateDeliveryStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query('SELECT status, payment_status FROM orders WHERE master_order_id = $1 FOR UPDATE', [orderId]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }
    const order = orderRes.rows[0];
    const shouldComplete = status === 'delivered' && order.payment_status === 'Paid';

    const updated = await client.query(
      shouldComplete
        ? `UPDATE orders SET delivery_status = $1, status = 'COMPLETED', progress_percentage = 100, updated_at = NOW() WHERE master_order_id = $2 RETURNING status, progress_percentage`
        : `UPDATE orders SET delivery_status = $1, updated_at = NOW() WHERE master_order_id = $2 RETURNING status, progress_percentage`,
      [status, orderId]
    );

    await client.query('COMMIT');

    const io = req.app.get('io');
    if (io) {
      io.emit('delivery_status_updated', { orderId: parseInt(orderId), status });
      if (shouldComplete) {
        io.to(`order_${orderId}`).emit('order_status_updated', {
          orderId: parseInt(orderId),
          status: updated.rows[0].status,
          progressPercentage: updated.rows[0].progress_percentage,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
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
