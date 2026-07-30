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

// Restaurant Base Location (Fallback values if process.env is not configured)
const RESTAURANT_LAT = parseFloat(process.env.RESTAURANT_LAT) || 40.7128;
const RESTAURANT_LON = parseFloat(process.env.RESTAURANT_LON) || -74.0060;

/**
 * Validates if a customer's location falls within the 10-mile delivery zone
 * @param {number} customerLat 
 * @param {number} customerLon 
 * @returns {Object} { isAllowed: boolean, distanceMiles: number }
 */
const isWithinDeliveryRadius = (customerLat, customerLon) => {
  if (!customerLat || !customerLon) {
    return { isAllowed: false, error: 'Latitude and longitude are required for delivery validation.' };
  }

  const distance = calculateDistanceInMiles(RESTAURANT_LAT, RESTAURANT_LON, parseFloat(customerLat), parseFloat(customerLon));
  
  return {
    isAllowed: distance <= MAX_DELIVERY_RADIUS_MILES,
    distanceMiles: parseFloat(distance.toFixed(2))
  };
};

module.exports = {
  calculateDistanceInMiles,
  isWithinDeliveryRadius,
  MAX_DELIVERY_RADIUS_MILES
};