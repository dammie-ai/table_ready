const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/db');

// Creates a Stripe PaymentIntent for the given order amount
exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required.' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert dollars to cents
      currency,
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Confirms the payment status with Stripe and updates the database record
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;

    if (!paymentIntentId || !orderId) {
      return res.status(400).json({ 
        error: 'Missing required parameters: paymentIntentId and orderId are required.' 
      });
    }

    // Verify payment status directly with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        error: `Payment not completed. Stripe status: ${paymentIntent.status}` 
      });
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

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: `Order with ID ${orderId} not found in database.` 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment confirmed and order status updated to Paid.',
      order: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};