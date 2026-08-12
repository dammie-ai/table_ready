const db = require('../config/db');
const pool = db.pool || db;

/**
 * GET /api/combo-meals
 * Get all combo meals
 */
exports.getComboMeals = async (req, res) => {
  try {
    // ?all=true is for the manager combo-management screen, which needs
    // to see (and be able to reactivate) deactivated combos too — the
    // customer-facing menu must never see anything but active ones.
    const query = req.query.all === 'true'
      ? 'SELECT * FROM combo_meals ORDER BY name ASC'
      : 'SELECT * FROM combo_meals WHERE is_active = true ORDER BY name ASC';
    const result = await pool.query(query);
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

/**
 * POST /api/combo-meals
 * Create a combo meal — previously only possible by hand in the database,
 * no create/update/delete existed anywhere in the backend.
 */
exports.createComboMeal = async (req, res) => {
  const { name, description, base_price, image_url, required_main_category, max_sides, sides_category } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO combo_meals (name, description, base_price, image_url, required_main_category, max_sides, sides_category, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING *`,
      [name, description || null, base_price, image_url || null, required_main_category, max_sides, sides_category]
    );
    return res.status(201).json({ success: true, combo: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /api/combo-meals/:id
 * Update a combo meal's own fields (not its sides — see addComboSide/removeComboSide).
 */
exports.updateComboMeal = async (req, res) => {
  const { id } = req.params;
  const { name, description, base_price, image_url, required_main_category, max_sides, sides_category, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE combo_meals SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         base_price = COALESCE($3, base_price),
         image_url = COALESCE($4, image_url),
         required_main_category = COALESCE($5, required_main_category),
         max_sides = COALESCE($6, max_sides),
         sides_category = COALESCE($7, sides_category),
         is_active = COALESCE($8, is_active),
         updated_at = NOW()
       WHERE combo_id = $9
       RETURNING *`,
      [name, description, base_price, image_url, required_main_category, max_sides, sides_category, is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Combo meal not found.' });
    }
    return res.status(200).json({ success: true, combo: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /api/combo-meals/:id
 * Soft delete (is_active = false), matching the pattern menu items use —
 * existing orders reference combo_id, so a hard delete isn't safe.
 */
exports.deleteComboMeal = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE combo_meals SET is_active = false, updated_at = NOW() WHERE combo_id = $1 RETURNING combo_id`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Combo meal not found.' });
    }
    return res.status(200).json({ success: true, message: 'Combo meal deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/combo-meals/:id/sides
 * Add an available side option to a combo.
 */
exports.addComboSide = async (req, res) => {
  const { id } = req.params;
  const { menu_item_id, is_default, sort_order } = req.body;
  try {
    const comboCheck = await pool.query('SELECT combo_id FROM combo_meals WHERE combo_id = $1', [id]);
    if (comboCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Combo meal not found.' });
    }
    const result = await pool.query(
      `INSERT INTO combo_meal_sides (combo_id, menu_item_id, is_default, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, menu_item_id, is_default || false, sort_order || 0]
    );
    return res.status(201).json({ success: true, side: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /api/combo-meals/:id/sides/:sideId
 */
exports.removeComboSide = async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM combo_meal_sides WHERE combo_side_id = $1 AND combo_id = $2 RETURNING combo_side_id`,
      [req.params.sideId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Side not found on this combo.' });
    }
    return res.status(200).json({ success: true, message: 'Side removed.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
