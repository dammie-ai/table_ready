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

router.use(authenticateToken);
router.use(authorizeRoles('admin', 'manager', 'waiter'));

router.post('/check-shift', checkEmployeeShift);
router.post('/', validate(schemas.createSession), createSession);
router.get('/', getActiveSessions);
router.put('/:id/close', closeSession);

module.exports = router;