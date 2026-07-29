const express = require('express');
const router = express.Router();
const { 
  checkEmployeeShift, 
  createSession, 
  getActiveSessions, 
  closeSession,
  joinSessionByCode
} = require('../controllers/sessionController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.post('/join-by-code', validate(schemas.joinSession), joinSessionByCode);

router.post('/check-shift', authenticateToken, authorizeRoles('admin', 'manager', 'waiter'), checkEmployeeShift);
router.post('/', authenticateToken, authorizeRoles('admin', 'manager', 'waiter'), validate(schemas.createSession), createSession);
router.get('/', authenticateToken, authorizeRoles('admin', 'manager', 'waiter'), getActiveSessions);
router.put('/:id/close', authenticateToken, authorizeRoles('admin', 'manager', 'waiter'), closeSession);

module.exports = router;