const db = require('../config/db');
const pool = db.pool || db;

/**
 * GET /api/promotions/dish-of-week
 * Get dish of the week
 */
exports.getDishOfWeek = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM promotions WHERE type = $1 LIMIT 1', ['dish_of_week']);
    return res.status(200).json({ success: true, dish: result.rows[0] || null });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/promotions/dish-of-week/calculate
 * Calculate dish of the week based on sales
 */
exports.calculateDishOfWeek = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT menu_item_id, COUNT(*) as order_count
      FROM order_items
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY menu_item_id
      ORDER BY order_count DESC
      LIMIT 1
    `);
    return res.status(200).json({ success: true, dish: result.rows[0] || null });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/promotions/dish-of-week/override
 * Override dish of the week
 */
exports.overrideDishOfWeek = async (req, res) => {
  try {
    const { menu_item_id } = req.body;
    await pool.query(
      'INSERT INTO promotions (type, menu_item_id) VALUES ($1, $2) ON CONFLICT (type) DO UPDATE SET menu_item_id = EXCLUDED.menu_item_id',
      ['dish_of_week', menu_item_id]
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/promotions/dish-of-week/active-discounts
 * Get active discounts
 */
exports.getActiveDiscounts = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM promotions WHERE active = true');
    return res.status(200).json({ success: true, discounts: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
