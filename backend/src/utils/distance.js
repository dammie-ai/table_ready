const configService = require('../services/configService');

/**
 * Calculates the straight-line distance between two coordinates (latitude/longitude)
 * in miles using the Haversine formula.
 */
const calculateDistanceInMiles = (lat1, lon1, lat2, lon2) => {
  const TO_RAD = Math.PI / 180;
  const EARTH_RADIUS_MILES = 3958.8; // Earth's radius in miles

  const dLat = (lat2 - lat1) * TO_RAD;
  const dLon = (lon2 - lon1) * TO_RAD;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * TO_RAD) * Math.cos(lat2 * TO_RAD) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
};

// Maximum allowed delivery radius from handwritten notes
const MAX_DELIVERY_RADIUS_MILES = 10;

// Only used if the 'geofence' row in restaurant_config has never been
// saved — the Settings page's Geofence Settings form is the real source
// of truth once a manager has used it.
const FALLBACK_RESTAURANT_LAT = parseFloat(process.env.RESTAURANT_LAT) || 40.7128;
const FALLBACK_RESTAURANT_LON = parseFloat(process.env.RESTAURANT_LON) || -74.0060;

/**
 * Validates if a customer's location falls within the given radius (miles)
 * of the restaurant's configured location.
 * @param {number} customerLat
 * @param {number} customerLon
 * @param {number} [radiusMiles] - defaults to MAX_DELIVERY_RADIUS_MILES if not given
 * @returns {Promise<Object>} { isAllowed: boolean, distanceMiles: number }
 */
const isWithinDeliveryRadius = async (customerLat, customerLon, radiusMiles = MAX_DELIVERY_RADIUS_MILES) => {
  if (!customerLat || !customerLon) {
    return { isAllowed: false, error: 'Latitude and longitude are required for delivery validation.' };
  }

  const geofence = await configService.getConfig('geofence');
  const restaurantLat = geofence?.restaurant_latitude ?? FALLBACK_RESTAURANT_LAT;
  const restaurantLon = geofence?.restaurant_longitude ?? FALLBACK_RESTAURANT_LON;

  const distance = calculateDistanceInMiles(restaurantLat, restaurantLon, parseFloat(customerLat), parseFloat(customerLon));

  return {
    isAllowed: distance <= radiusMiles,
    distanceMiles: parseFloat(distance.toFixed(2))
  };
};

module.exports = {
  calculateDistanceInMiles,
  isWithinDeliveryRadius,
  MAX_DELIVERY_RADIUS_MILES
};