const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { isWithinDeliveryRadius } = require('../utils/distance');
const { splitEvenly, splitByItem, checkBalanceStatus } = require('../utils/billSplitter');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authGuard');

/**
 * Middleware to check delivery radius requirements before creating Stripe intent
 */
const validateDeliveryRadius = (req, res, next) => {
  const { order_mode, latitude, longitude } = req.body;

  if (order_mode === 'delivery') {
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Delivery orders require latitude and longitude coordinates.'
      });
    }

    const radiusCheck = isWithinDeliveryRadius(latitude, longitude);

    if (!radiusCheck.isAllowed) {
      return res.status(400).json({
        success: false,
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
router.post('/split-bill/calculate', (req, res) => {
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

    return res.status(400).json({ success: false, error: 'Invalid split mode. Must be "even" or "itemized".' });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// Create split PaymentIntents for each payer
router.post('/split-bill/create-intents', authenticateToken, async (req, res) => {
  try {
    const { order_id, splits } = req.body;

    if (!order_id || !splits || !Array.isArray(splits) || splits.length === 0) {
      return res.status(400).json({ success: false, error: 'order_id and splits array are required.' });
    }

    const orderRes = await pool.query(`SELECT * FROM orders WHERE master_order_id = $1`, [order_id]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const order = orderRes.rows[0];
    const paymentIntents = [];

    for (const split of splits) {
      if (!split.amount || split.amount <= 0) {
        return res.status(400).json({ success: false, error: 'Each split must have a positive amount.' });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(split.amount * 100),
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        },
        metadata: {
          order_id: order_id.toString(),
          split_index: split.index || 0,
          split_label: split.label || `Payer ${split.index || 0 + 1}`,
        }
      });

      await pool.query(
        `INSERT INTO order_payments (master_order_id, payment_method, amount, stripe_payment_intent_id, status, paid_by_customer_id, paid_by_user_id)
         VALUES ($1, 'stripe', $2, $3, 'pending', $4, $5)`,
        [order_id, split.amount, paymentIntent.id, split.customer_id || null, req.user.id]
      );

      paymentIntents.push({
        index: split.index || 0,
        label: split.label || `Payer ${split.index || 0 + 1}`,
        amount: split.amount,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    }

    return res.status(201).json({
      success: true,
      message: `Created ${paymentIntents.length} payment intents.`,
      paymentIntents,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
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
    return res.status(400).json({ success: false, error: 'Webhook signature verification failed.' });
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