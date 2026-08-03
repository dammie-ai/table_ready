const db = require('../config/db');
const pool = db.pool || db;

/**
 * GET /api/combo-meals
 * Get all combo meals
 */
exports.getComboMeals = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM combo_meals WHERE is_active = true ORDER BY name ASC');
    return res.status(200).json({ success: true, count: result.rows.length, combos: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/combo-meals/:id
 * Get combo meal detail with sides
 */
exports.getComboMealDetail = async (req, res) => {
  try {
    const comboResult = await pool.query('SELECT * FROM combo_meals WHERE combo_id = $1', [req.params.id]);
    if (comboResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Combo meal not found.' });
    }

    const sidesResult = await pool.query(
      'SELECT * FROM combo_meal_sides WHERE combo_id = $1 ORDER BY sort_order ASC',
      [req.params.id]
    );

    return res.status(200).json({
      success: true,
      combo: { ...comboResult.rows[0], sides: sidesResult.rows },
      sides: sidesResult.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
