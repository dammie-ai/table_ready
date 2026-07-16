const jwt = require('jsonwebtoken');

// Verifies the user is logged in
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expects "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Security token missing.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key');
    req.user = verified; // Injected with payload: { id, username, role }
    next();
  } catch (err) {
    res.status(403).json({ error: 'Session expired or invalid token.' });
  }
};

// Enforces roles with Admin VIP override
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // ADMIN OVERRIDE: Admin can log into/access any department board
    if (req.user.role === 'admin') {
      return next();
    }

    // DEPARTMENTS ISOLATION: Check if current user's role is allowed on this route
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access Denied. Your role (${req.user.role}) cannot access this department's services.` 
      });
    }

    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };