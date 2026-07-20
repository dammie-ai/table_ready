const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Handles initial payment intent creation for Stripe
router.post('/create-intent', paymentController.createPaymentIntent);

// Confirms payment status with Stripe and updates the order in PostgreSQL
router.post('/confirm', paymentController.confirmPayment);

module.exports = router;