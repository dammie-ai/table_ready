const db = require('../config/db');
const pool = db.pool || db;

const getComboMeals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT combo_id, name, description, base_price, image_url, required_main_category, max_sides, sides_category, is_active
       FROM combo_meals
       WHERE is_active = true
       ORDER BY combo_id ASC`
    );

    const combos = result.rows.map(combo => ({
      ...combo,
      base_price: parseFloat(combo.base_price)
    }));

    return res.status(200).json({
      success: true,
      count: combos.length,
      combos
    });
  } catch (error) {
    console.error('Error fetching combo meals:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

const getComboMealDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const comboRes = await pool.query(
      `SELECT combo_id, name, description, base_price, image_url, required_main_category, max_sides, sides_category, is_active
       FROM combo_meals
       WHERE combo_id = $1 AND is_active = true`,
      [id]
    );

    if (comboRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Combo meal not found.' });
    }

    const combo = comboRes.rows[0];
    combo.base_price = parseFloat(combo.base_price);

    const sidesRes = await pool.query(
      `SELECT cms.combo_side_id, cms.combo_id, cms.menu_item_id, cms.is_default, cms.sort_order,
              mi.name, mi.base_price, mi.image_url, mi.category_type
       FROM combo_meal_sides cms
       JOIN menu_items mi ON cms.menu_item_id = mi.item_id
       WHERE cms.combo_id = $1 AND mi.is_active = true
       ORDER BY cms.sort_order ASC, mi.name ASC`,
      [id]
    );

    const sides = sidesRes.rows.map(s => ({
      ...s,
      base_price: parseFloat(s.base_price)
    }));

    return res.status(200).json({
      success: true,
      combo,
      sides
    });
  } catch (error) {
    console.error('Error fetching combo meal detail:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

module.exports = {
  getComboMeals,
  getComboMealDetail
};
