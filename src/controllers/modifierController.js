const pool = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

exports.getModifiers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM menu_modifiers WHERE is_active = true ORDER BY name ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      modifiers: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getModifierById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM menu_modifiers WHERE modifier_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Modifier not found.' });
    }

    return res.status(200).json({
      success: true,
      modifier: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.createModifier = async (req, res) => {
  const { name, description, price_adjustment, modifier_type, is_active } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Modifier name is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO menu_modifiers (name, description, price_adjustment, modifier_type, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description || null, price_adjustment || 0.00, modifier_type || 'choice', is_active !== false]
    );

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'MODIFIER_CREATED',
      entity_type: 'menu_modifier',
      entity_id: result.rows[0].modifier_id,
      new_value: JSON.stringify({ name, price_adjustment, modifier_type }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(201).json({
      success: true,
      message: 'Modifier created successfully.',
      modifier: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateModifier = async (req, res) => {
  const { id } = req.params;
  const { name, description, price_adjustment, modifier_type, is_active } = req.body;

  try {
    const result = await pool.query(
      `UPDATE menu_modifiers
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price_adjustment = COALESCE($3, price_adjustment),
           modifier_type = COALESCE($4, modifier_type),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE modifier_id = $6
       RETURNING *`,
      [name, description, price_adjustment, modifier_type, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Modifier not found.' });
    }

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'MODIFIER_UPDATED',
      entity_type: 'menu_modifier',
      entity_id: parseInt(id),
      new_value: JSON.stringify(result.rows[0]),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: 'Modifier updated successfully.',
      modifier: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteModifier = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM menu_modifiers WHERE modifier_id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Modifier not found.' });
    }

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'MODIFIER_DELETED',
      entity_type: 'menu_modifier',
      entity_id: parseInt(id),
      old_value: JSON.stringify(result.rows[0]),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: 'Modifier deleted successfully.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getMenuItemModifiers = async (req, res) => {
  const { menu_item_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT mim.*, m.name, m.description, m.price_adjustment, m.modifier_type
       FROM menu_item_modifiers mim
       JOIN menu_modifiers m ON mim.modifier_id = m.modifier_id
       WHERE mim.menu_item_id = $1 AND m.is_active = true
       ORDER BY mim.sort_order ASC, m.name ASC`,
      [menu_item_id]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      modifiers: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.addModifierToItem = async (req, res) => {
  const { menu_item_id } = req.params;
  const { modifier_id, is_required, max_quantity, sort_order } = req.body;

  if (!modifier_id) {
    return res.status(400).json({ success: false, error: 'modifier_id is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO menu_item_modifiers (menu_item_id, modifier_id, is_required, max_quantity, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [menu_item_id, modifier_id, is_required || false, max_quantity || 1, sort_order || 0]
    );

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'MODIFIER_ADDED_TO_ITEM',
      entity_type: 'menu_item_modifier',
      entity_id: result.rows[0].item_modifier_id,
      new_value: JSON.stringify({ menu_item_id, modifier_id, is_required }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(201).json({
      success: true,
      message: 'Modifier added to menu item.',
      item_modifier: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.removeModifierFromItem = async (req, res) => {
  const { menu_item_id, modifier_id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM menu_item_modifiers
       WHERE menu_item_id = $1 AND modifier_id = $2
       RETURNING *`,
      [menu_item_id, modifier_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Modifier not found on this item.' });
    }

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'MODIFIER_REMOVED_FROM_ITEM',
      entity_type: 'menu_item_modifier',
      entity_id: result.rows[0].item_modifier_id,
      old_value: JSON.stringify({ menu_item_id, modifier_id }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: 'Modifier removed from menu item.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
