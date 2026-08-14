const db = require('../config/db');
const pool = db.pool || db;

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
        SUM(oi.quantity * mi.base_price) as revenue
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
    // orders.customer_id identifies the CUSTOMER who placed the order —
    // customer accounts and staff (users) are separate id spaces, so
    // joining orders to staff on o.customer_id = u.id (the old query)
    // matched staff to orders by numeric coincidence, not by who actually
    // handled anything. The only real staff-to-order link the schema has
    // is indirect: a waiter is assigned to a table (restaurant_tables.
    // waiter_id), and dine-in orders carry that table_number. That means
    // this can only attribute dine-in orders to waiters — kitchen/
    // delivery/manager/admin/other roles have no per-order attribution
    // anywhere in the schema, so they correctly show 0 rather than a
    // fabricated number. It also reflects the table's *current* waiter,
    // not necessarily who was serving it when an older order was placed.
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
      LEFT JOIN restaurant_tables rt ON rt.waiter_id = u.id
      LEFT JOIN orders o ON o.table_number = rt.table_number AND o.order_type IN ('DINE_IN', 'IN_HOUSE')
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

/**
 * GET /api/analytics/service-ratings
 * Per-waiter average customer service rating (0-10) — kept separate from
 * getStaffPerformance's sales metrics deliberately, see 002_add_service_ratings.sql.
 */
exports.getServiceRatings = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.username,
        COUNT(sr.rating_id) AS ratings_count,
        ROUND(AVG(sr.score)::numeric, 2) AS avg_score
      FROM users u
      LEFT JOIN service_ratings sr ON sr.waiter_id = u.id
      WHERE u.role = 'waiter'
      GROUP BY u.id, u.username
      ORDER BY avg_score DESC NULLS LAST
    `);

    return res.status(200).json({ success: true, waiters: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/analytics/top-items?period=day|week|month|year
 * Most-ordered menu items for a given rolling window. This is the "what's
 * actually selling right now" view for Kitchen Display + Manager Panel --
 * different job from getDishOfWeekStats above (that one has no date
 * filtering at all and is scoped to the dish-of-the-week promo feature),
 * so rather than bolt period filtering onto it, it gets its own query.
 */
exports.getTopItems = async (req, res) => {
  try {
    // Anything that isn't one of these four just falls back to 'day' --
    // no point erroring out over a typo'd query param on a read-only view.
    const VALID_PERIODS = ['day', 'week', 'month', 'year'];
    let { period } = req.query;
    if (!VALID_PERIODS.includes(period)) {
      period = 'day';
    }

    // Keeping the cutoff math intentionally dumb: 'day' mirrors the
    // since-midnight pattern dashboardController already uses everywhere,
    // and week/month/year are just rolling N-day windows -- no calendar
    // months or ISO week boundaries, that precision isn't needed for a
    // "what's hot" leaderboard.
    let cutoff;
    if (period === 'week') {
      cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    } else {
      cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
    }

    // Same cancelled/refunded exclusion used throughout dashboardController
    // and salesAudit -- an order nobody ended up getting shouldn't count
    // toward "most ordered" just because it was placed at some point.
    const result = await pool.query(
      `SELECT
        oi.item_id,
        mi.name,
        SUM(oi.quantity) AS total_quantity,
        COUNT(DISTINCT oi.master_order_id) AS order_count
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.item_id
      JOIN orders o ON oi.master_order_id = o.master_order_id
      WHERE o.created_at >= $1
        AND o.status NOT IN ('CANCELLED', 'CANCELLED_AND_REFUNDED')
      GROUP BY oi.item_id, mi.name
      ORDER BY total_quantity DESC
      LIMIT 10`,
      [cutoff]
    );

    return res.status(200).json({
      success: true,
      period,
      items: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};