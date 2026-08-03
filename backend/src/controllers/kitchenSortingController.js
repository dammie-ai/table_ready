const db = require('../config/db');
const pool = db.pool || db;

/**
 * GET /api/kitchen/sorting/types
 * Get order types
 */
exports.getOrderTypes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT order_type FROM orders 
      WHERE status NOT IN ('PICKED_UP', 'COMPLETED', 'CANCELLED')
      ORDER BY order_type ASC
    `);
    return res.status(200).json({ success: true, types: result.rows.map(r => r.order_type) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/kitchen/sorting/:order_type
 * Get orders by type
 */
exports.getOrdersByType = async (req, res) => {
  try {
    const { order_type } = req.params;
    const result = await pool.query(
      'SELECT * FROM orders WHERE order_type = $1 AND status NOT IN ($2, $3) ORDER BY created_at ASC',
      [order_type, 'PICKED_UP', 'COMPLETED', 'CANCELLED']
    );
    return res.status(200).json({ success: true, orders: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/kitchen/sorting/summary
 * Get all order types summary
 */
exports.getAllOrderTypesSummary = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT order_type, COUNT(*) as count, 
             SUM(CASE WHEN status = 'RECEIVED' THEN 1 ELSE 0 END) as received,
             SUM(CASE WHEN status = 'IN_PREPARATION' THEN 1 ELSE 0 END) as in_preparation,
             SUM(CASE WHEN status = 'COOKING' THEN 1 ELSE 0 END) as cooking,
             SUM(CASE WHEN status = 'READY' THEN 1 ELSE 0 END) as ready
      FROM orders
      WHERE status NOT IN ('PICKED_UP', 'COMPLETED', 'CANCELLED')
      GROUP BY order_type
      ORDER BY order_type ASC
    `);
    return res.status(200).json({ success: true, summary: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/kitchen/sorting/:order_type/details
 * Get kitchen channel details
 */
exports.getKitchenChannel = async (req, res) => {
  try {
    const { order_type } = req.params;
    const result = await pool.query(
      'SELECT * FROM orders WHERE order_type = $1 AND status NOT IN ($2, $3, $4) ORDER BY created_at ASC',
      [order_type, 'PICKED_UP', 'COMPLETED', 'CANCELLED']
    );
    return res.status(200).json({ success: true, orders: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
