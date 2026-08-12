const db = require('../config/db');
const pool = db.pool || db;
const { logAudit } = require('../utils/auditLogger');

exports.scanOrderForAllergens = async (req, res) => {
  const { order_id } = req.params;

  try {
    const orderRes = await pool.query(
      `SELECT o.master_order_id, o.order_type, o.table_number, o.customer_id,
              json_agg(
                json_build_object(
                  'order_item_id', oi.order_item_id,
                  'item_id', oi.item_id,
                  'quantity', oi.quantity,
                  'item_status', oi.item_status
                )
              ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.master_order_id = oi.master_order_id
       WHERE o.master_order_id = $1
       GROUP BY o.master_order_id, o.order_type, o.table_number, o.customer_id`,
      [order_id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Order #${order_id} not found.` });
    }

    const order = orderRes.rows[0];
    const alerts = [];

    for (const item of order.items) {
      const menuItemRes = await pool.query(
        `SELECT mi.name, mi.allergens
         FROM menu_items mi
         WHERE mi.item_id = $1 AND mi.is_active = true`,
        [item.item_id]
      );

      if (menuItemRes.rows.length === 0) continue;

      const menuItem = menuItemRes.rows[0];
      const allergens = menuItem.allergens || [];

      if (allergens.length > 0) {
        const itemAlert = {
          order_item_id: item.order_item_id,
          item_name: menuItem.name,
          allergens: allergens,
          severity: allergens.length > 2 ? 'HIGH' : 'MEDIUM',
        };
        alerts.push(itemAlert);

        await pool.query(
          `UPDATE order_items
           SET has_allergy_alert = true
           WHERE order_item_id = $1`,
          [item.order_item_id]
        );
      }
    }

    if (alerts.length > 0) {
      const io = req.app.get('io');
      if (io) {
        io.emit('allergy_alert', {
          order_id: order.master_order_id,
          alerts: alerts,
          message: `ALLERGY ALERT: Order #${order.master_order_id} contains items with allergens.`,
        });
      }

      await logAudit({
        actor_id: req.user?.id || null,
        actor_username: req.user?.username || null,
        action: 'ALLERGY_SCAN',
        entity_type: 'order',
        entity_id: order.master_order_id,
        new_value: JSON.stringify({ alerts: alerts.map((a) => ({ item: a.item_name, allergens: a.allergens, severity: a.severity })) }),
        ip_address: req.ip || req.connection.remoteAddress,
      });
    }

    return res.status(200).json({
      success: true,
      order_id: order.master_order_id,
      alerts: alerts,
      alert_count: alerts.length,
      scanned_at: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllergyAlerts = async (req, res) => {
  const { order_id } = req.query;

  try {
    let query = `
      SELECT oi.order_item_id, oi.master_order_id, mi.name AS item_name,
             mi.allergens, oi.quantity, oi.item_status,
             o.order_type, o.table_number, o.status AS order_status
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.item_id
      JOIN orders o ON oi.master_order_id = o.master_order_id
      WHERE oi.has_allergy_alert = true
    `;
    const params = [];
    let paramCount = 0;

    if (order_id) {
      paramCount++;
      query += ` AND oi.master_order_id = $${paramCount}`;
      params.push(order_id);
    }

    query += ` ORDER BY oi.master_order_id ASC`;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      alerts: result.rows,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.scanMenuItemForAllergens = async (req, res) => {
  const { item_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT mi.item_id, mi.name, mi.allergens, mi.category_type, mi.base_price,
              json_agg(
                json_build_object(
                  'inventory_id', mii.inventory_id,
                  'item_name', i.item_name,
                  'quantity_required', mii.quantity_required
                )
              ) AS ingredients
       FROM menu_items mi
       LEFT JOIN menu_item_ingredients mii ON mi.item_id = mii.menu_item_id
       LEFT JOIN inventory i ON mii.inventory_id = i.id
       WHERE mi.item_id = $1
       GROUP BY mi.item_id, mi.name, mi.allergens, mi.category_type, mi.base_price`,
      [item_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Menu item not found.' });
    }

    const item = result.rows[0];
    const allergens = item.allergens || [];

    return res.status(200).json({
      success: true,
      item: {
        item_id: item.item_id,
        name: item.name,
        allergens: allergens,
        allergen_count: allergens.length,
        has_allergens: allergens.length > 0,
      },
      ingredients: item.ingredients.filter((i) => i.inventory_id !== null),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.addAllergensToMenuItem = async (req, res) => {
  const { item_id } = req.params;
  const { allergens } = req.body;

  if (!Array.isArray(allergens)) {
    return res.status(400).json({ success: false, error: 'allergens must be an array.' });
  }

  try {
    const result = await pool.query(
      `UPDATE menu_items
       SET allergens = $1
       WHERE item_id = $2
       RETURNING item_id, name, allergens`,
      [allergens, item_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Menu item not found.' });
    }

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'ALLERGEN_UPDATED',
      entity_type: 'menu_item',
      entity_id: item_id,
      new_value: JSON.stringify({ allergens }),
      ip_address: req.ip || req.connection.remoteAddress,
    });

    return res.status(200).json({
      success: true,
      message: `Allergens updated for "${result.rows[0].name}".`,
      item: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllergenSummary = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mi.item_id, mi.name, mi.allergens, mi.category_type,
              COUNT(oi.order_item_id) AS times_ordered
       FROM menu_items mi
       LEFT JOIN order_items oi ON mi.item_id = oi.item_id
       WHERE mi.is_active = true
       GROUP BY mi.item_id, mi.name, mi.allergens, mi.category_type
       ORDER BY times_ordered DESC NULLS LAST`
    );

    const summary = result.rows.map((row) => ({
      item_id: row.item_id,
      name: row.name,
      allergens: row.allergens || [],
      allergen_count: (row.allergens || []).length,
      category_type: row.category_type,
      times_ordered: parseInt(row.times_ordered) || 0,
    }));

    const allergenFrequency = {};
    summary.forEach((item) => {
      (item.allergens || []).forEach((a) => {
        if (!allergenFrequency[a]) {
          allergenFrequency[a] = { count: 0, items: [] };
        }
        allergenFrequency[a].count++;
        allergenFrequency[a].items.push(item.name);
      });
    });

    return res.status(200).json({
      success: true,
      menu_items_with_allergens: summary.filter((i) => i.allergen_count > 0),
      allergen_frequency: allergenFrequency,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};