const db = require('../config/db');
const pool = db.pool || db;
const { logAudit } = require('../utils/auditLogger');

/**
 * POST /api/service-requests
 * Customer creates a service request (call server, refill, bill request)
 */
exports.createServiceRequest = async (req, res) => {
  const { table_number, request_type, notes, session_id } = req.body;

  if (!table_number || !request_type) {
    return res.status(400).json({ success: false, error: 'table_number and request_type are required.' });
  }

  const validTypes = ['call_server', 'refill', 'bill_request', 'other'];
  if (!validTypes.includes(request_type)) {
    return res.status(400).json({ success: false, error: `Invalid request_type. Must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `INSERT INTO service_requests (table_number, session_id, request_type, notes, created_by_customer)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [table_number, session_id || null, request_type, notes || null]
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('service_request_created', result.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: 'Service request created.',
      request: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/service-requests
 * Staff fetch service requests (optionally filter by status/table)
 */
exports.getServiceRequests = async (req, res) => {
  const { status, table_number } = req.query;

  try {
    let query = `SELECT * FROM service_requests WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (table_number) {
      paramCount++;
      query += ` AND table_number = $${paramCount}`;
      params.push(parseInt(table_number));
    }

    query += ` ORDER BY created_at ASC`;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      requests: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PATCH /api/service-requests/:id/acknowledge
 * Staff acknowledges a service request
 */
exports.acknowledgeRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE service_requests
       SET status = 'acknowledged', acknowledged_by = $1, acknowledged_at = NOW()
       WHERE request_id = $2 AND status = 'pending'
       RETURNING *`,
      [req.user?.id || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Request not found or already acknowledged.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('service_request_updated', result.rows[0]);
    }

    return res.status(200).json({
      success: true,
      message: 'Request acknowledged.',
      request: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PATCH /api/service-requests/:id/complete
 * Staff marks a service request as completed
 */
exports.completeRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE service_requests
       SET status = 'completed', completed_at = NOW()
       WHERE request_id = $1 AND status IN ('pending', 'acknowledged')
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Request not found or cannot be completed.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('service_request_updated', result.rows[0]);
    }

    return res.status(200).json({
      success: true,
      message: 'Request marked as handled.',
      request: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PATCH /api/service-requests/:id/cancel
 * Cancel a service request (customer or staff)
 */
exports.cancelRequest = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE service_requests
       SET status = 'cancelled', cancelled_at = NOW()
       WHERE request_id = $1 AND status IN ('pending', 'acknowledged')
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Request not found or cannot be cancelled.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('service_request_updated', result.rows[0]);
    }

    return res.status(200).json({
      success: true,
      message: 'Request cancelled.',
      request: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};