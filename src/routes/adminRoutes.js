const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');

const pool = db.pool || db;

// All admin routes require authentication + admin or manager role
router.use(authenticateToken);
router.use(authorizeRoles('admin', 'manager'));

/**
 * GET /api/admin/surge-pricing/config
 * Fetch current dynamic pricing toggle status and configured tiers
 */
router.get('/surge-pricing/config', async (req, res) => {
  try {
    const settingRes = await pool.query(
      `SELECT value FROM settings WHERE key = 'dynamic_pricing_enabled'`
    );
    const tiersRes = await pool.query(
      `SELECT * FROM surge_tiers ORDER BY min_orders ASC`
    );

    const isEnabled = settingRes.rows[0]?.value === 'true';

    return res.status(200).json({
      success: true,
      dynamicPricingEnabled: isEnabled,
      tiers: tiersRes.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/admin/surge-pricing/toggle
 * Quickly toggle dynamic pricing ON or OFF
 */
router.patch('/surge-pricing/toggle', async (req, res) => {
  const { enabled } = req.body; // Expects boolean: true or false

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'Payload must contain a boolean "enabled" property.'
    });
  }

  try {
    const settingRes = await pool.query(
      `SELECT value FROM settings WHERE key = 'dynamic_pricing_enabled'`
    );
    const oldEnabled = settingRes.rows[0]?.value === 'true';

    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('dynamic_pricing_enabled', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [enabled.toString()]
    );

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'SURGE_TOGGLED',
      entity_type: 'setting',
      entity_id: 1,
      old_value: oldEnabled ? 'true' : 'false',
      new_value: enabled.toString(),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: `Dynamic pricing feature is now ${enabled ? 'ENABLED' : 'DISABLED'}.`,
      dynamicPricingEnabled: enabled
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/surge-pricing/tiers
 * Replace existing tier rules with new admin configurations
 */
router.put('/surge-pricing/tiers', async (req, res) => {
  const { tiers } = req.body;
  // Expected format: [{ min_orders: 0, max_orders: 10, multiplier: 1.00 }, ...]

  if (!tiers || !Array.isArray(tiers)) {
    return res.status(400).json({
      success: false,
      error: 'Payload must include an array of tiers.'
    });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    await client.query(`DELETE FROM surge_tiers`);

    for (const tier of tiers) {
      await client.query(
        `INSERT INTO surge_tiers (min_orders, max_orders, multiplier) VALUES ($1, $2, $3)`,
        [tier.min_orders, tier.max_orders || null, tier.multiplier]
      );
    }

    await client.query('COMMIT');

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'SURGE_TIERS_UPDATED',
      entity_type: 'surge_tiers',
      new_value: JSON.stringify(tiers),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: 'Pricing tiers updated successfully.'
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (client) client.release();
  }
});

/**
 * GET /api/admin/restaurant-config
 * Get all restaurant config
 */
router.get('/restaurant-config', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM restaurant_config`);
    const config = {};
    result.rows.forEach(row => {
      config[row.config_key] = row.config_value;
    });
    return res.status(200).json({ success: true, config });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/admin/restaurant-config/:key
 * Update a specific restaurant config key
 */
router.patch('/restaurant-config/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (!value) {
    return res.status(400).json({ success: false, error: 'value is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO restaurant_config (config_key, config_value)
       VALUES ($1, $2)
       ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = NOW()
       RETURNING *`,
      [key, JSON.stringify(value)]
    );

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'CONFIG_UPDATED',
      entity_type: 'restaurant_config',
      entity_id: key,
      new_value: JSON.stringify(value),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({ success: true, config: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/settings
 * Get all settings
 */
router.get('/settings', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM settings`);
    return res.status(200).json({ success: true, settings: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/admin/settings/:key
 * Update a specific setting
 */
router.patch('/settings/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (!value) {
    return res.status(400).json({ success: false, error: 'value is required.' });
  }

  try {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, String(value)]
    );

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'SETTING_UPDATED',
      entity_type: 'setting',
      entity_id: key,
      new_value: String(value),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({ success: true, message: 'Setting updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;