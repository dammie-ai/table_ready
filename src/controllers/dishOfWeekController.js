const db = require('../config/db');
const pool = db.pool || db;
const { logAudit } = require('../utils/auditLogger');

/**
 * GET /api/promotions/dish-of-week
 * Fetch current Dish of the Week configuration
 */
exports.getDishOfWeek = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, mi.name as item_name, mi.base_price, mi.category_type
      FROM dish_of_week_config d
      LEFT JOIN menu_items mi ON d.menu_item_id = mi.item_id
      WHERE d.is_active = true
      ORDER BY d.category_type ASC
    `);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      dishes: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/promotions/dish-of-week/calculate
 * Auto-calculate and set Dish of the Week based on order frequency
 */
exports.calculateDishOfWeek = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get all menu categories
    const categories = await client.query(`
      SELECT DISTINCT category_type FROM menu_items WHERE is_active = true
    `);

    const categoryTypes = categories.rows.map(r => r.category_type);

    // For each category, find the top-ordered item
    for (const category of categoryTypes) {
      const topItem = await client.query(`
        SELECT oi.item_id, COUNT(*) as order_count
        FROM order_items oi
        JOIN menu_items mi ON oi.item_id = mi.item_id
        WHERE mi.category_type = $1
        GROUP BY oi.item_id
        ORDER BY order_count DESC
        LIMIT 1
      `, [category]);

      if (topItem.rows.length > 0) {
        await client.query(
          `INSERT INTO dish_of_week_config (category_type, menu_item_id, discount_percentage, is_override, is_active)
           VALUES ($1, $2, 14.00, false, true)
           ON CONFLICT (category_type, is_active) WHERE is_active = true
           DO UPDATE SET menu_item_id = EXCLUDED.menu_item_id,
                        discount_percentage = EXCLUDED.discount_percentage,
                        updated_at = NOW()`,
          [category, topItem.rows[0].item_id]
        );
      }
    }

    // Find overall top-ordered dish
    const overallTop = await client.query(`
      SELECT oi.item_id, COUNT(*) as order_count
      FROM order_items oi
      GROUP BY oi.item_id
      ORDER BY order_count DESC
      LIMIT 1
    `);

    if (overallTop.rows.length > 0) {
      await client.query(
        `INSERT INTO dish_of_week_config (category_type, menu_item_id, discount_percentage, is_override, is_active)
         VALUES ('overall', $1, 21.00, false, true)
         ON CONFLICT (category_type, is_active) WHERE is_active = true AND category_type = 'overall'
         DO UPDATE SET menu_item_id = EXCLUDED.menu_item_id,
                      discount_percentage = EXCLUDED.discount_percentage,
                      updated_at = NOW()`,
        [overallTop.rows[0].item_id]
      );
    }

    await client.query('COMMIT');

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'DISH_OF_WEEK_CALCULATED',
      entity_type: 'promotion',
      new_value: JSON.stringify({ categories: categoryTypes }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: 'Dish of the Week calculated and updated.'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

/**
 * POST /api/promotions/dish-of-week/override
 * Admin manually overrides Dish of the Week for a category
 */
exports.overrideDishOfWeek = async (req, res) => {
  const { category_type, menu_item_id, discount_percentage, period_start, period_end } = req.body;

  if (!category_type || !menu_item_id) {
    return res.status(400).json({ success: false, error: 'category_type and menu_item_id are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO dish_of_week_config (category_type, menu_item_id, discount_percentage, is_override, period_start, period_end, is_active)
       VALUES ($1, $2, $3, true, $4, $5, true)
       ON CONFLICT (category_type, is_active) WHERE is_active = true
       DO UPDATE SET menu_item_id = EXCLUDED.menu_item_id,
                    discount_percentage = EXCLUDED.discount_percentage,
                    is_override = true,
                    period_start = EXCLUDED.period_start,
                    period_end = EXCLUDED.period_end,
                    updated_at = NOW()
       RETURNING *`,
      [category_type, menu_item_id, discount_percentage || 14.00, period_start || null, period_end || null]
    );

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'DISH_OF_WEEK_OVERRIDE',
      entity_type: 'promotion',
      entity_id: result.rows[0].config_id,
      new_value: JSON.stringify({ category_type, menu_item_id, discount_percentage }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: 'Dish of the Week overridden successfully.',
      config: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/promotions/dish-of-week/active-discounts
 * Get active discounts for cart/checkout
 */
exports.getActiveDiscounts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM dish_of_week_config WHERE is_active = true`
    );

    const discounts = result.rows.reduce((acc, row) => {
      acc[row.category_type] = {
        menu_item_id: row.menu_item_id,
        discount_percentage: parseFloat(row.discount_percentage),
        is_override: row.is_override
      };
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      discounts
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};