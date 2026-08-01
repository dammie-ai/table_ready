const express = require('express');
const router = express.Router();
const db = require('../config/db');
const pool = db.pool || db;
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query("SELECT config_key, config_value FROM restaurant_config");
    const config = {};
    for (const row of result.rows) {
      config[row.config_key] = row.config_value;
    }
    return res.status(200).json({
      success: true,
      config,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/geofence', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT config_value FROM restaurant_config WHERE config_key = 'geofence'"
    );
    
    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        radius_meters: 100,
        unit: 'meters',
        restaurant_latitude: null,
        restaurant_longitude: null
      });
    }

    const config = result.rows[0].config_value;
    return res.status(200).json({
      success: true,
      radius_meters: parseInt(config.radius_meters || 100),
      unit: 'meters',
      restaurant_latitude: config.restaurant_latitude || null,
      restaurant_longitude: config.restaurant_longitude || null
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), async (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Config updates must be an object.' });
    }

    const results = {};
    for (const [key, value] of Object.entries(updates)) {
      let existingConfig = {};
      const existingRes = await pool.query(
        "SELECT config_value FROM restaurant_config WHERE config_key = $1",
        [key]
      );
      if (existingRes.rows.length > 0 && existingRes.rows[0].config_value) {
        existingConfig = typeof existingRes.rows[0].config_value === 'object' 
          ? existingRes.rows[0].config_value 
          : JSON.parse(existingRes.rows[0].config_value || '{}');
      }
      const mergedConfig = { ...existingConfig, ...(typeof value === 'object' ? value : { value }) };
      const jsonValue = JSON.stringify(mergedConfig);
      await pool.query(
        `INSERT INTO restaurant_config (config_key, config_value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (config_key) DO UPDATE SET config_value = $2, updated_at = NOW()`,
        [key, jsonValue]
      );
      results[key] = mergedConfig;
    }

    return res.status(200).json({ success: true, config: results });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
