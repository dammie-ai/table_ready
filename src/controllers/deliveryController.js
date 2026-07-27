const db = require('../config/db');
const pool = db.pool || db;
const { logAudit } = require('../utils/auditLogger');

const VALID_DELIVERY_STATUSES = ['assigned', 'accepted', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'];

exports.assignDriver = async (req, res) => {
  const { order_id, driver_id } = req.body;

  if (!order_id || !driver_id) {
    return res.status(400).json({ success: false, error: 'order_id and driver_id are required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      `SELECT * FROM orders WHERE master_order_id = $1 AND order_type = 'DELIVERY' FOR UPDATE`,
      [order_id]
    );

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Delivery order not found.' });
    }

    const order = orderRes.rows[0];

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED' || order.status === 'CANCELLED_AND_REFUNDED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: `Cannot assign driver to order #${order_id}: order is already ${order.status}.` });
    }

    const existingAssignment = await client.query(
      `SELECT * FROM order_assignments WHERE order_id = $1 AND status NOT IN ('cancelled', 'delivered')`,
      [order_id]
    );

    if (existingAssignment.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Order already has an active driver assignment.' });
    }

    const driverRes = await client.query(
      `SELECT id, username, role FROM users WHERE id = $1 AND role = 'delivery'`,
      [driver_id]
    );

    if (driverRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Driver not found or does not have delivery role.' });
    }

    const assignment = await client.query(
      `INSERT INTO order_assignments (order_id, assigned_to, assigned_by, status)
       VALUES ($1, $2, $3, 'assigned')
       RETURNING *`,
      [order_id, driver_id, req.user?.id || null]
    );

    await client.query(
      `UPDATE orders SET delivery_status = 'assigned', updated_at = NOW() WHERE master_order_id = $1`,
      [order_id]
    );

    await client.query('COMMIT');

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'DRIVER_ASSIGNED',
      entity_type: 'order',
      entity_id: parseInt(order_id),
      new_value: JSON.stringify({ driver_id, assignment_id: assignment.rows[0].assignment_id }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order_id}`).emit('driver_assigned', {
        orderId: parseInt(order_id),
        driverId: driver_id,
        driverName: driverRes.rows[0].username,
        assignment: assignment.rows[0]
      });
      io.to(`driver_${driver_id}`).emit('new_delivery_assignment', {
        orderId: parseInt(order_id),
        assignment: assignment.rows[0]
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Driver assigned successfully.',
      assignment: assignment.rows[0],
      driver: driverRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!status || !VALID_DELIVERY_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Must be one of: ${VALID_DELIVERY_STATUSES.join(', ')}`
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const assignmentRes = await client.query(
      `SELECT * FROM order_assignments WHERE order_id = $1 AND status NOT IN ('cancelled', 'delivered') FOR UPDATE`,
      [orderId]
    );

    if (assignmentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'No active assignment found for this order.' });
    }

    const assignment = assignmentRes.rows[0];

    const now = new Date();
    let updateFields = 'status = $1, updated_at = NOW()';
    const updateValues = [status];

    if (status === 'accepted') {
      updateFields += ', accepted_at = NOW()';
    } else if (status === 'delivered') {
      updateFields += ', delivered_at = NOW()';
    }

    const updatedAssignment = await client.query(
      `UPDATE order_assignments SET ${updateFields} WHERE assignment_id = $${updateValues.length + 1} RETURNING *`,
      [...updateValues, assignment.assignment_id]
    );

    const orderStatusMap = {
      'assigned': 'ASSIGNED',
      'accepted': 'PREPARING',
      'picked_up': 'READY',
      'out_for_delivery': 'OUT_FOR_DELIVERY',
      'delivered': 'DELIVERED',
      'cancelled': 'CANCELLED'
    };

    await client.query(
      `UPDATE orders SET status = $1, delivery_status = $2, updated_at = NOW() WHERE master_order_id = $3`,
      [orderStatusMap[status] || order.status, status, orderId]
    );

    await client.query('COMMIT');

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'DELIVERY_STATUS_UPDATED',
      entity_type: 'order',
      entity_id: parseInt(orderId),
      new_value: JSON.stringify({ status, assignment_id: assignment.assignment_id }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${orderId}`).emit('delivery_status_updated', {
        orderId: parseInt(orderId),
        status: status,
        assignment: updatedAssignment.rows[0]
      });
    }

    return res.status(200).json({
      success: true,
      message: `Delivery status updated to '${status}'.`,
      assignment: updatedAssignment.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

exports.updateDriverLocation = async (req, res) => {
  const { orderId } = req.params;
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ success: false, error: 'latitude and longitude are required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE orders
       SET driver_latitude = $1, driver_longitude = $2, updated_at = NOW()
       WHERE master_order_id = $3
       RETURNING *`,
      [latitude, longitude, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${orderId}`).emit('driver_location_updated', {
        orderId: parseInt(orderId),
        latitude,
        longitude,
        updatedAt: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Driver location updated.',
      order: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getDeliveryHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    const history = await pool.query(
      `SELECT o.master_order_id, o.status, o.total_amount, o.created_at, o.delivery_status,
              cp.first_name, cp.last_name, cp.phone,
              oa.accepted_at, oa.delivered_at
       FROM orders o
       LEFT JOIN customer_profiles cp ON o.customer_id = cp.customer_id
       LEFT JOIN order_assignments oa ON o.master_order_id = oa.order_id
       WHERE o.order_type = 'DELIVERY' AND oa.assigned_to = $1 AND o.status IN ('DELIVERED', 'CANCELLED', 'CANCELLED_AND_REFUNDED')
       ORDER BY o.created_at DESC
       LIMIT 50`,
      [userId]
    );

    const stats = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE o.status = 'DELIVERED') AS total_delivered,
         COUNT(*) FILTER (WHERE o.status = 'CANCELLED' OR o.status = 'CANCELLED_AND_REFUNDED') AS total_cancelled,
         COALESCE(SUM(o.total_amount), 0) AS total_earnings
       FROM orders o
       LEFT JOIN order_assignments oa ON o.master_order_id = oa.order_id AND oa.assigned_to = $1
       WHERE o.order_type = 'DELIVERY' AND o.created_at >= $2`,
      [userId, new Date(new Date().setHours(0, 0, 0, 0))]
    );

    return res.status(200).json({
      success: true,
      role: 'delivery',
      history: history.rows,
      stats: stats.rows[0] || {}
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
