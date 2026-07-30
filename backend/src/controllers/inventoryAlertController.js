const db = require('../config/db');
const pool = db.pool || db;

/**
 * GET /api/inventory/alerts
 * Fetch all active low-stock alerts with item details
 */
exports.getActiveAlerts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.alert_id,
        a.inventory_id,
        i.item_name,
        i.sku,
        a.current_stock,
        a.threshold,
        a.status,
        a.created_at
      FROM low_stock_alerts a
      JOIN inventory i ON a.inventory_id = i.id
      WHERE a.status = 'active'
      ORDER BY a.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      alerts: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/inventory/alerts/history
 * Fetch all alerts including acknowledged and resolved
 */
exports.getAlertHistory = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.alert_id,
        a.inventory_id,
        i.item_name,
        i.sku,
        a.current_stock,
        a.threshold,
        a.status,
        a.acknowledged_by,
        a.acknowledged_at,
        a.resolved_at,
        a.created_at
      FROM low_stock_alerts a
      JOIN inventory i ON a.inventory_id = i.id
      ORDER BY a.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      alerts: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/inventory/alerts/:id/acknowledge
 * Mark an alert as acknowledged by a staff member
 */
exports.acknowledgeAlert = async (req, res) => {
  const { id } = req.params;
  const { acknowledged_by } = req.body;

  try {
    const result = await pool.query(
      `UPDATE low_stock_alerts
       SET status = 'acknowledged',
           acknowledged_by = $1,
           acknowledged_at = NOW()
       WHERE alert_id = $2 AND status = 'active'
       RETURNING *`,
      [acknowledged_by || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Alert #${id} not found or already acknowledged/resolved.`
      });
    }

    return res.status(200).json({
      success: true,
      message: `Alert #${id} acknowledged.`,
      alert: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/inventory/alerts/:id/resolve
 * Mark an alert as resolved (stock replenished)
 */
exports.resolveAlert = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE low_stock_alerts
       SET status = 'resolved',
           resolved_at = NOW()
       WHERE alert_id = $1 AND status IN ('active', 'acknowledged')
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Alert #${id} not found or already resolved.`
      });
    }

    return res.status(200).json({
      success: true,
      message: `Alert #${id} resolved.`,
      alert: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Helper: Create alert if stock is at or below reorder threshold
 * Called internally after stock deductions
 */
exports.createAlertIfNeeded = async (inventoryId) => {
  try {
    const itemRes = await pool.query(
      `SELECT id, item_name, stock_quantity, reorder_threshold 
       FROM inventory 
       WHERE id = $1 AND is_active = true`,
      [inventoryId]
    );

    if (itemRes.rows.length === 0) return;

    const item = itemRes.rows[0];

    if (item.stock_quantity <= item.reorder_threshold) {
      const existingAlert = await pool.query(
        `SELECT alert_id FROM low_stock_alerts 
         WHERE inventory_id = $1 AND status IN ('active', 'acknowledged')`,
        [inventoryId]
      );

      if (existingAlert.rows.length === 0) {
        await pool.query(
          `INSERT INTO low_stock_alerts (inventory_id, current_stock, threshold)
           VALUES ($1, $2, $3)`,
          [inventoryId, item.stock_quantity, item.reorder_threshold]
        );

        return {
          triggered: true,
          itemName: item.item_name,
          currentStock: item.stock_quantity,
          threshold: item.reorder_threshold
        };
      }
    }

    return { triggered: false };
  } catch (err) {
    console.error('Error creating low stock alert:', err);
    return { triggered: false, error: err.message };
  }
};
