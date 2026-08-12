const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

// Guest-bookable, same as joining the waitlist or placing an order — no
// account required. Cancelling stays staff-only below since there's no
// ownership check to verify a caller cancelling is the one who booked.
router.post('/', validate(schemas.createReservation), reservationController.createReservation);

router.get('/', authenticateToken, reservationController.getReservations);

router.get('/date/:date', authenticateToken, reservationController.getReservationsForDate);

router.get('/:id', authenticateToken, reservationController.getReservationById);

router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), validate(schemas.updateReservation), reservationController.updateReservation);

router.patch('/:id/cancel', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), reservationController.cancelReservation);

router.post('/:id/seat', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager', 'waiter'), reservationController.seatReservation);

module.exports = router;
