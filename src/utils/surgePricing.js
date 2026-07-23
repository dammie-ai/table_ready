const db = require('../db'); // Adjust path to match your db import if needed

/**
 * Calculates current price multiplier based on admin toggle & active order volume.
 * @returns {Promise<number>} Pricing multiplier (1.00 if feature is toggled off)
 */
async function getSurgeMultiplier() {
  try {
    // 1. Check if the admin has Dynamic Pricing turned ON
    const settingRes = await db.query(
      `SELECT value FROM settings WHERE key = 'dynamic_pricing_enabled'`
    );
    const isDynamicPricingEnabled = settingRes.rows[0]?.value === 'true';

    // If turned OFF by admin, stick to standard base pricing (1.0x)
    if (!isDynamicPricingEnabled) {
      return 1.00;
    }

    // 2. Count current active kitchen orders
    const countRes = await db.query(
      `SELECT COUNT(*) AS active_count 
       FROM orders 
       WHERE status IN ('RECEIVED', 'PREPARING', 'ON_HOLD')`
    );
    const activeOrders = parseInt(countRes.rows[0].active_count, 10) || 0;

    // 3. Find matching tier configured in DB
    const tierRes = await db.query(
      `SELECT multiplier FROM surge_tiers 
       WHERE $1 >= min_orders 
         AND ($1 <= max_orders OR max_orders IS NULL)
       ORDER BY min_orders DESC 
       LIMIT 1`,
      [activeOrders]
    );

    if (tierRes.rows.length > 0) {
      return parseFloat(tierRes.rows[0].multiplier);
    }

    return 1.00; // Fallback to base pricing if no matching tier
  } catch (error) {
    console.error('Error calculating dynamic surge multiplier:', error);
    return 1.00;
  }
}

/**
 * Applies multiplier to a base price and rounds to 2 decimal places
 */
function calculateAdjustedPrice(basePrice, multiplier) {
  const adjusted = parseFloat(basePrice) * multiplier;
  return Math.round(adjusted * 100) / 100;
}

module.exports = {
  getSurgeMultiplier,
  calculateAdjustedPrice,
};