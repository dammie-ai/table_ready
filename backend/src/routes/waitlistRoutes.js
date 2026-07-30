const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlistController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.post('/join', authenticateToken, validate(schemas.joinWaitlist), waitlistController.joinWaitlist);
router.get('/', authenticateToken, waitlistController.getWaitlist);
router.get('/queue/:table_id', authenticateToken, waitlistController.getWaitlistQueue);
router.post('/:entry_id/seat', authenticateToken, authorizeRoles('admin', 'manager', 'waiter'), waitlistController.seatNextInLine);
router.patch('/:entry_id/cancel', authenticateToken, waitlistController.cancelWaitlistEntry);
router.patch('/:entry_id/noshow', authenticateToken, authorizeRoles('admin', 'manager'), waitlistController.markNoShow);

module.exports = router;