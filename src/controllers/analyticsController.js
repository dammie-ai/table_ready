const pool = require('../config/db');

/**
 * GET /api/analytics/category-sales
 * Revenue breakdown by category and fulfillment type
 */
exports.getCategorySales = async (req, res) => {
  const { start_date, end_date } = req.query;

  try {
    let query = `
      SELECT 
        mi.category_type,
        o.order_type,
        COUNT(DISTINCT o.master_order_id) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * o.total_amount / COUNT(oi.order_item_id) OVER (PARTITION BY oi.master_order_id)) as revenue
      FROM orders o
      JOIN order_items oi ON o.master_order_id = oi.master_order_id
      JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      query += ` AND o.created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND o.created_at <= $${paramCount}`;
      params.push(end_date);
    }

    query += `
      GROUP BY mi.category_type, o.order_type
      ORDER BY mi.category_type ASC, o.order_type ASC
    `;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      sales: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/analytics/staff-performance
 * Rank waiters/staff by performance metrics
 */
exports.getStaffPerformance = async (req, res) => {
  const { start_date, end_date } = req.query;

  try {
    let query = `
      SELECT 
        u.id,
        u.username,
        u.role,
        COUNT(DISTINCT o.master_order_id) as orders_handled,
        SUM(o.total_amount) as total_revenue,
        AVG(o.progress_percentage) as avg_progress,
        COUNT(DISTINCT CASE WHEN o.status = 'COMPLETED' THEN o.master_order_id END) as completed_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'CANCELLED' THEN o.master_order_id END) as cancelled_orders
      FROM users u
      LEFT JOIN orders o ON o.ordered_by_user_id = u.id OR o.waiter_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      query += ` AND o.created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND o.created_at <= $${paramCount}`;
      params.push(end_date);
    }

    query += `
      GROUP BY u.id, u.username, u.role
      ORDER BY total_revenue DESC NULLS LAST
    `;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      staff: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/analytics/dish-of-week-stats
 * Get order frequency data for dish of the week calculation
 */
exports.getDishOfWeekStats = async (req, res) => {
  try {
    const categoryStats = await pool.query(`
      SELECT 
        mi.category_type,
        oi.item_id,
        mi.name,
        COUNT(*) as order_count,
        SUM(oi.quantity) as total_quantity
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE mi.is_active = true
      GROUP BY mi.category_type, oi.item_id, mi.name
      ORDER BY mi.category_type ASC, order_count DESC
    `);

    const overallStats = await pool.query(`
      SELECT 
        oi.item_id,
        mi.name,
        mi.category_type,
        COUNT(*) as order_count,
        SUM(oi.quantity) as total_quantity
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.item_id
      WHERE mi.is_active = true
      GROUP BY oi.item_id, mi.name, mi.category_type
      ORDER BY order_count DESC
      LIMIT 1
    `);

    return res.status(200).json({
      success: true,
      by_category: categoryStats.rows,
      overall_top: overallStats.rows[0] || null
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};