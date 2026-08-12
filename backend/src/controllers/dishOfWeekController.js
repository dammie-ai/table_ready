const db = require('../config/db');
const pool = db.pool || db;

/**
 * GET /api/promotions/dish-of-week
 * Get dish of the week
 */
exports.getDishOfWeek = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, mi.name, mi.base_price, mi.image_url
       FROM promotions p
       LEFT JOIN menu_items mi ON p.menu_item_id = mi.item_id
       WHERE p.type = $1 LIMIT 1`,
      ['dish_of_week']
    );
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
    // discount_percentage/active were validated as required but never
    // actually written — the row kept whatever (unset) value it had
    // before, so a manager's chosen discount silently never applied, and
    // the row might not even satisfy active = true for
    // getActiveDiscounts to surface it.
    const { menu_item_id, discount_percentage } = req.body;
    await pool.query(
      `INSERT INTO promotions (type, menu_item_id, discount_percentage, active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (type) DO UPDATE SET menu_item_id = EXCLUDED.menu_item_id, discount_percentage = EXCLUDED.discount_percentage, active = true, updated_at = NOW()`,
      ['dish_of_week', menu_item_id, discount_percentage ?? 0]
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
    // dish_of_week already renders as its own featured card above this
    // list on the Promotions page — exclude it here so setting one
    // doesn't also duplicate it into the generic list below now that
    // overrideDishOfWeek actually sets active = true.
    const result = await pool.query(`SELECT * FROM promotions WHERE active = true AND type != 'dish_of_week'`);
    return res.status(200).json({ success: true, discounts: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PATCH /api/promotions/:id
 * Toggle a promotion active/inactive — staff-web's Promotions page called
 * this exact route already, but nothing on the backend ever implemented
 * it, so every toggle 404'd silently.
 */
exports.togglePromotion = async (req, res) => {
  const { active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE promotions SET active = $1, updated_at = NOW() WHERE promotion_id = $2 RETURNING *`,
      [active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Promotion not found.' });
    }
    return res.status(200).json({ success: true, promotion: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
