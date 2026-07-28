const db = require('../config/db');
const pool = db.pool || db;

/**
 * Logs a sensitive action to the audit_logs table.
 *
 * @param {Object} options
 * @param {number|null} options.actor_id - ID of the user performing the action
 * @param {string|null} options.actor_username - Username of the actor
 * @param {string} options.action - Action performed (e.g., "REFUND_ISSUED", "SURGE_TOGGLED")
 * @param {string} options.entity_type - Type of entity affected (e.g., "order", "setting", "inventory")
 * @param {number|null} options.entity_id - ID of the affected entity
 * @param {string|null} options.old_value - Previous value (JSON string or plain text)
 * @param {string|null} options.new_value - New value (JSON string or plain text)
 * @param {string|null} options.ip_address - Requester IP address
 * @param {string|null} options.user_agent - Requester user agent
 */
async function logAudit({
  actor_id = null,
  actor_username = null,
  action,
  entity_type,
  entity_id = null,
  old_value = null,
  new_value = null,
  ip_address = null,
  user_agent = null
} = {}) {
  if (!action || !entity_type) {
    console.warn('Audit log skipped: action and entity_type are required.');
    return null;
  }

  try {
    const result = await pool.query(
      `INSERT INTO audit_logs 
       (actor_id, actor_username, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [actor_id, actor_username, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent]
    );
    return result.rows[0];
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
    return null;
  }
}

module.exports = { logAudit };
