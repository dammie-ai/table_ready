const jwt = require('jsonwebtoken');

const ROLE_HIERARCHY = {
  manager: 6,
  admin: 5,
  assistant_manager: 4,
  kitchen: 3,
  delivery: 2,
  waiter: 2,
  other: 1
};

const hasMasterControl = (userRoles) => {
  const roles = Array.isArray(userRoles) ? userRoles : (userRoles ? [userRoles] : []);
  return roles.includes('manager');
};

const hasMinimumRole = (userRoles, minimumRole) => {
  const roles = Array.isArray(userRoles) ? userRoles : (userRoles ? [userRoles] : []);
  if (roles.includes('manager')) return true;
  const userLevel = Math.max(...roles.map(r => ROLE_HIERARCHY[r] || 0));
  const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;
  return userLevel >= requiredLevel;
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Security token missing.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'tableready_secret');
    req.user = verified;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Session expired or invalid token.' });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const userRoles = Array.isArray(req.user.roles) 
      ? req.user.roles 
      : (req.user.role ? [req.user.role] : []);

    if (userRoles.includes('manager')) {
      return next();
    }

    const hasPermission = userRoles.some(role => allowedRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        error: `Access Denied. Your role (${userRoles.join(', ')}) cannot access this department's services.`
      });
    }

    next();
  };
};

const requireMasterControl = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const userRoles = Array.isArray(req.user.roles) 
    ? req.user.roles 
    : (req.user.role ? [req.user.role] : []);

  if (!hasMasterControl(userRoles)) {
    return res.status(403).json({
      error: 'Access Denied. Only the Manager has master control access to customiser features.'
    });
  }

  next();
};

module.exports = { 
  authenticateToken, 
  authorizeRoles, 
  requireMasterControl,
  hasMasterControl,
  hasMinimumRole,
  ROLE_HIERARCHY
};
