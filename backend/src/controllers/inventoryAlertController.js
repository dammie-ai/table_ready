const db = require('../config/db');
const pool = db.pool || db;

/**
 * GET /api/inventory/alerts
 * Get active low-stock alerts
 */
exports.getActiveAlerts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.item_id, i.item_name, i.stock_quantity, i.reorder_threshold
      FROM inventory i
      WHERE i.stock_quantity <= i.reorder_threshold
      ORDER BY i.stock_quantity ASC
    `);
    return res.status(200).json({ success: true, alerts: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/inventory/alerts/history
 * Get alert history
 */
exports.getAlertHistory = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_alerts ORDER BY created_at DESC LIMIT 100');
    return res.status(200).json({ success: true, alerts: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/inventory/alerts/:id/acknowledge
 * Acknowledge an alert
 */
exports.acknowledgeAlert = async (req, res) => {
  try {
    await pool.query('UPDATE inventory_alerts SET acknowledged = true WHERE alert_id = $1', [req.params.id]);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/inventory/alerts/:id/resolve
 * Resolve an alert
 */
exports.resolveAlert = async (req, res) => {
  try {
    await pool.query('UPDATE inventory_alerts SET resolved = true WHERE alert_id = $1', [req.params.id]);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
