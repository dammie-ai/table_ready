const db = require('../config/db');
const pool = db.pool || db;

/**
 * POST /api/admin/audit-logs
 * Internal helper endpoint to log sensitive actions.
 * Accepts: { actor_id, actor_username, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent }
 */
exports.createLog = async (req, res) => {
  const {
    actor_id,
    actor_username,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value,
    ip_address,
    user_agent
  } = req.body;

  if (!action || !entity_type) {
    return res.status(400).json({ success: false, error: 'action and entity_type are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO audit_logs 
       (actor_id, actor_username, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [actor_id || null, actor_username || null, action, entity_type, entity_id || null, old_value || null, new_value || null, ip_address || null, user_agent || null]
    );

    return res.status(201).json({ success: true, log: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/admin/audit-logs
 * Fetch audit logs with optional filters: ?actor_id=1&entity_type=order&limit=50&offset=0
 */
exports.getLogs = async (req, res) => {
  const { actor_id, entity_type, entity_id, limit = 50, offset = 0 } = req.query;

  try {
    let query = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (actor_id) {
      paramCount++;
      query += ` AND actor_id = $${paramCount}`;
      params.push(actor_id);
    }

    if (entity_type) {
      paramCount++;
      query += ` AND entity_type = $${paramCount}`;
      params.push(entity_type);
    }

    if (entity_id) {
      paramCount++;
      query += ` AND entity_id = $${paramCount}`;
      params.push(entity_id);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      logs: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
