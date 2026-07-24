const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { isWithinDeliveryRadius } = require('../utils/distance');
const { splitEvenly, splitByItem, checkBalanceStatus } = require('../utils/billSplitter');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/db');

/**
 * Middleware to check delivery radius requirements before creating Stripe intent
 */
const validateDeliveryRadius = (req, res, next) => {
  const { order_mode, latitude, longitude } = req.body;

  if (order_mode === 'delivery') {
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'Delivery orders require latitude and longitude coordinates.'
      });
    }

    const radiusCheck = isWithinDeliveryRadius(latitude, longitude);

    if (!radiusCheck.isAllowed) {
      return res.status(400).json({
        error: `Delivery unavailable. Your location is ${radiusCheck.distanceMiles} miles away (Maximum allowed delivery radius is 10 miles).`
      });
    }
  }

  next();
};

// Handles initial payment intent creation for Stripe (with 10-mile delivery check)
router.post('/create-intent', validateDeliveryRadius, paymentController.createPaymentIntent);

// Confirms payment status with Stripe and updates the order in PostgreSQL
router.post('/confirm', paymentController.confirmPayment);

// Bill-Splitting Engine Endpoint (TAB-32)
router.post('/split', (req, res) => {
  try {
    const { mode, total, splits, guestOrders, tax = 0, tip = 0, totalPaid = 0 } = req.body;

    if (mode === 'even') {
      const splitAmounts = splitEvenly(total, splits);
      const balance = checkBalanceStatus(total, totalPaid);
      return res.json({
        mode: 'even',
        total,
        splits: splitAmounts,
        balance
      });
    }

    if (mode === 'itemized') {
      const guestSplits = splitByItem(guestOrders, tax, tip);
      const calculatedTotal = guestSplits.reduce((acc, g) => acc + g.total, 0);
      const balance = checkBalanceStatus(calculatedTotal, totalPaid);
      return res.json({
        mode: 'itemized',
        splits: guestSplits,
        calculatedTotal: parseFloat(calculatedTotal.toFixed(2)),
        balance
      });
    }

    return res.status(400).json({ error: 'Invalid split mode. Must be "even" or "itemized".' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Stripe webhook for automatic payment confirmation
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed.' });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.order_id;

    if (orderId) {
      try {
        await pool.query(
          `UPDATE orders
           SET payment_status = 'Paid',
               stripe_charge_id = $1
           WHERE master_order_id = $2`,
          [paymentIntent.id, orderId]
        );
      } catch (dbErr) {
        console.error('Failed to update order payment status:', dbErr.message);
      }
    }
  }

  res.json({ received: true });
});

module.exports = router;