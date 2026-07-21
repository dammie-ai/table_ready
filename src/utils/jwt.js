const jwt = require('jsonwebtoken');

// Secret key used to sign tokens (pulls from .env or uses default fallback)
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';

/**
 * Generate a JWT containing user identity and role information
 * Supports both single role strings and multi-role arrays (from handwritten notes)
 * @param {Object} user - User object containing id, username, and role/roles
 * @returns {string} Signed JWT token valid for 8 hours
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role,                         // Single role string fallback
      roles: user.roles || [user.role]         // Multi-role array support
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
};

/**
 * Verify an incoming JWT token
 * @param {string} token - JWT token string
 * @returns {Object|null} Decoded token payload if valid, null if invalid/expired
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
};