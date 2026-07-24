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
 * GET /api/admin/surge-config
 * Fetch current dynamic pricing toggle status and configured tiers
 */
router.get('/surge-config', async (req, res) => {
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
 * PATCH /api/admin/surge-toggle
 * Quickly toggle dynamic pricing ON or OFF
 */
router.patch('/surge-toggle', async (req, res) => {
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
 * PUT /api/admin/surge-tiers
 * Replace existing tier rules with new admin configurations
 */
router.put('/surge-tiers', async (req, res) => {
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

    // Clear old tiers and re-insert new configurations
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

module.exports = router;