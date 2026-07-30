const express = require('express');
const router = express.Router();
const db = require('../config/db');
const pool = db.pool || db;

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

module.exports = router;
