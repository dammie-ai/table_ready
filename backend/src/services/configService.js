const pool = require('../config/db');
const db = require('../config/db');
const dbPool = db.pool || db;

let configCache = {};
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadConfig(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && Object.keys(configCache).length > 0 && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return configCache;
  }

  const result = await dbPool.query('SELECT config_key, config_value FROM restaurant_config');
  configCache = {};
  result.rows.forEach(row => {
    configCache[row.config_key] = row.config_value;
  });
  cacheTimestamp = now;
  return configCache;
}

async function getConfig(key, defaultValue = null) {
  const config = await loadConfig();
  return key ? (config[key] || defaultValue) : config;
}

async function setConfig(key, value) {
  await dbPool.query(
    'INSERT INTO restaurant_config (config_key, config_value) VALUES ($1, $2) ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = NOW()',
    [key, JSON.stringify(value)]
  );
  configCache = {};
  return true;
}

async function getTaxRate() {
  const taxConfig = await getConfig('tax_rate');
  return taxConfig ? parseFloat(taxConfig.rate || 0) : 0;
}

async function getBusinessHours() {
  const hours = await getConfig('business_hours');
  return hours || {};
}

async function isWithinBusinessHours() {
  const hours = await getBusinessHours();
  const now = new Date();
  const dayName = now.toLocaleLowerCaseString('en-US', { weekday: 'long' });
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayHours = hours[dayName];
  if (!dayHours) return false;
  const [openHour, openMin] = (dayHours.open || '00:00').split(':').map(Number);
  const [closeHour, closeMin] = (dayHours.close || '23:59').split(':').map(Number);
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

async function getOrderTypeConfig() {
  const statuses = await getConfig('order_statuses');
  return statuses || {};
}

async function getBranding() {
  return await getConfig('branding', {});
}

async function getDeliveryRadius() {
  const radius = await getConfig('delivery_radius');
  return radius ? parseInt(radius.max_miles || 10) : 10;
}

async function getGeofenceRadius() {
  const radius = await getConfig('geofence');
  return radius ? parseInt(radius.radius_meters || 100) : 100;
}

async function refreshCache() {
  return loadConfig(true);
}

module.exports = {
  loadConfig,
  getConfig,
  setConfig,
  getTaxRate,
  getBusinessHours,
  isWithinBusinessHours,
  getOrderTypeConfig,
  getBranding,
  getDeliveryRadius,
  getGeofenceRadius,
  refreshCache,
};
