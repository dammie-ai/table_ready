const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlistController');
const { authenticateToken, authenticateOptional, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

// Joining/cancelling a waitlist spot are guest actions — a walk-in customer
// has no account, same principle as guest ordering and service requests
// elsewhere in this app.
router.post('/join', validate(schemas.joinWaitlist), waitlistController.joinWaitlist);
router.get('/', authenticateToken, waitlistController.getWaitlist);
router.get('/queue/:table_id', authenticateToken, waitlistController.getWaitlistQueue);
router.post('/:entry_id/seat', authenticateToken, authorizeRoles('admin', 'manager', 'waiter'), waitlistController.seatNextInLine);
router.patch('/:entry_id/cancel', authenticateOptional, waitlistController.cancelWaitlistEntry);
router.patch('/:entry_id/noshow', authenticateToken, authorizeRoles('admin', 'manager'), waitlistController.markNoShow);

module.exports = router;