const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/db');
const pool = db.pool || db;

// Creates a Stripe PaymentIntent for the given order amount
exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, error: 'Amount is required.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Confirms the payment status with Stripe and updates the database record
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    if (!paymentIntentId || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: paymentIntentId and orderId are required.'
      });
    }

    // Verify payment status directly with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: `Payment not completed. Stripe status: ${paymentIntent.status}`
      });
    }

    const orderRes = await pool.query('SELECT total_amount, stripe_charge_id FROM orders WHERE master_order_id = $1', [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Order with ID ${orderId} not found in database.`
      });
    }
    const order = orderRes.rows[0];

    // The client picks which orderId to send here — without this, a
    // PaymentIntent charged for a cheap (or $0.01) order could be presented
    // against any other order's ID to mark it Paid without ever charging
    // the real amount. Reject if what was actually charged (verified fresh
    // from Stripe above, never trusted from the request) falls short of
    // what this order actually costs.
    const expectedCents = Math.round(parseFloat(order.total_amount) * 100);
    if (paymentIntent.amount < expectedCents) {
      return res.status(400).json({
        success: false,
        error: `Charged amount ($${(paymentIntent.amount / 100).toFixed(2)}) does not cover this order's total ($${parseFloat(order.total_amount).toFixed(2)}).`
      });
    }

    // Prevents replaying the same successful charge across multiple
    // orders — each PaymentIntent can only ever confirm the one order it's
    // already been used for.
    if (order.stripe_charge_id && order.stripe_charge_id !== paymentIntentId) {
      return res.status(400).json({ success: false, error: 'This order has already been paid with a different charge.' });
    }
    const reuseCheck = await pool.query(
      `SELECT master_order_id FROM orders WHERE stripe_charge_id = $1 AND master_order_id != $2`,
      [paymentIntentId, orderId]
    );
    if (reuseCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'This payment has already been used to pay for a different order.' });
    }

    // Update the database record once payment is verified
    const query = `
      UPDATE orders
      SET payment_status = 'Paid',
          stripe_charge_id = $1
      WHERE master_order_id = $2
      RETURNING *;
    `;
    const values = [paymentIntentId, orderId];
    const result = await pool.query(query, values);

    res.status(200).json({
      success: true,
      message: 'Payment confirmed and order status updated to Paid.',
      order: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};