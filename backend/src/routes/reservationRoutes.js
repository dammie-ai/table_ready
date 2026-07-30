const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.post('/', authenticateToken, validate(schemas.createReservation), reservationController.createReservation);

router.get('/', authenticateToken, reservationController.getReservations);

router.get('/date/:date', authenticateToken, reservationController.getReservationsForDate);

router.get('/:id', authenticateToken, reservationController.getReservationById);

router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), validate(schemas.updateReservation), reservationController.updateReservation);

router.patch('/:id/cancel', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), reservationController.cancelReservation);

router.post('/:id/seat', authenticateToken, authorizeRoles('admin', 'manager', 'waiter'), reservationController.seatReservation);

module.exports = router;
