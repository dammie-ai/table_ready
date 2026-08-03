const db = require('../config/db');
const pool = db.pool || db;

/**
 * POST /api/admin/audit-logs
 * Create audit log
 */
exports.createLog = async (req, res) => {
  try {
    const { action, entity_type, entity_id, details, user_id } = req.body;
    const result = await pool.query(
      'INSERT INTO audit_logs (action, entity_type, entity_id, details, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING log_id',
      [action, entity_type, entity_id, JSON.stringify(details || {}), user_id || null]
    );
    return res.status(201).json({ success: true, log_id: result.rows[0].log_id });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/admin/audit-logs
 * Get audit logs
 */
exports.getLogs = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    return res.status(200).json({ success: true, logs: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
