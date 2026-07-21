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
    req.user = verified; // Injected with payload: { id, username, role / roles }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Session expired or invalid token.' });
  }
};

// Enforces roles with Admin VIP override and Multi-Role support
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Normalize user roles into an array (supports single 'role' string or 'roles' array)
    const userRoles = Array.isArray(req.user.roles) 
      ? req.user.roles 
      : (req.user.role ? [req.user.role] : []);

    // ADMIN OVERRIDE (Handwritten Notes): Admin can log into/access any department board
    if (userRoles.includes('admin')) {
      return next();
    }

    // DEPARTMENTS ISOLATION & MULTI-ROLE: Check if current user's role(s) match allowed route roles
    const hasPermission = userRoles.some(role => allowedRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        error: `Access Denied. Your role (${userRoles.join(', ')}) cannot access this department's services.`
      });
    }

    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };