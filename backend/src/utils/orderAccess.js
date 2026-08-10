const crypto = require('crypto');

// A customer cancelling their own order has no staff login to prove
// ownership with — this gives them an unguessable, stateless proof
// instead (a keyed hash of the order ID, so no new DB column or session
// system is needed). Staff bypass this entirely via their own role.
const SECRET = process.env.JWT_SECRET || 'tableready_secret';

function generateOrderAccessToken(orderId) {
  return crypto.createHmac('sha256', SECRET).update(String(orderId)).digest('hex').slice(0, 24);
}

function verifyOrderAccessToken(orderId, token) {
  if (!token) return false;
  const expected = Buffer.from(generateOrderAccessToken(orderId));
  const provided = Buffer.from(String(token));
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

module.exports = { generateOrderAccessToken, verifyOrderAccessToken };
