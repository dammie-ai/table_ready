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

// Public route for customers joining a table session by code
router.post('/join-by-code', joinSessionByCode);

// All other session routes require staff authentication
router.use(authenticateToken);
router.use(authorizeRoles('admin', 'manager', 'waiter'));

router.post('/check-shift', checkEmployeeShift);
router.post('/', createSession);
router.get('/', getActiveSessions);
router.put('/:id/close', closeSession);

module.exports = router;