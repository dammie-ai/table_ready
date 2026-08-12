const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const pool = db.pool || db;

// Deliberately separate from authController.js's staff login. Staff tokens
// carry a role that authorizeRoles() checks against; these carry `type:
// 'customer'` and no role field at all, so a customer token can never pass
// a staff permission check no matter what — the two identity spaces don't
// share a table, an endpoint, or a token shape.
function signCustomerToken(customer) {
  // customer_id (not id) matches notificationController.js's existing
  // req.user?.customer_id fallback — written, it looks like, in
  // anticipation of exactly this token shape.
  return jwt.sign(
    { customer_id: customer.customer_id, email: customer.email, type: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function toUser(customer) {
  return {
    id: customer.customer_id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
  };
}

exports.register = async (req, res) => {
  const { email, password, first_name, last_name, phone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
  }

  try {
    const existing = await pool.query(
      'SELECT customer_id, email, password_hash FROM customer_profiles WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0 && existing.rows[0].password_hash) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let customer;

    if (existing.rows.length > 0) {
      // A guest profile with this email already exists from a past guest
      // order (customer_profiles rows get created for guests too) — upgrade
      // it in place so any order history tied to that customer_id carries
      // forward, rather than creating an orphaned duplicate.
      const updated = await pool.query(
        `UPDATE customer_profiles
         SET password_hash = $1, is_guest = false, updated_at = NOW(),
             first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name), phone = COALESCE($4, phone)
         WHERE customer_id = $5
         RETURNING customer_id, email, first_name, last_name`,
        [passwordHash, first_name || null, last_name || null, phone || null, existing.rows[0].customer_id]
      );
      customer = updated.rows[0];
    } else {
      const inserted = await pool.query(
        `INSERT INTO customer_profiles (email, password_hash, first_name, last_name, phone, is_guest)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING customer_id, email, first_name, last_name`,
        [email, passwordHash, first_name || null, last_name || null, phone || null]
      );
      customer = inserted.rows[0];
    }

    return res.status(201).json({ success: true, token: signCustomerToken(customer), user: toUser(customer) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteAccount = async (req, res) => {
  // authenticateToken only verifies the JWT and sets req.user -- it doesn't
  // check shape, so this also has to reject a staff token here (no
  // customer_id/type on those) rather than deleting the wrong row.
  if (req.user?.type !== 'customer' || !req.user?.customer_id) {
    return res.status(403).json({ success: false, error: 'This action requires a customer account.' });
  }

  try {
    // orders.customer_id has no FK to customer_profiles (unenforced,
    // intentionally loose) -- order history survives as a business record
    // with a dangling customer_id once the profile itself is gone.
    // customer_sessions/favorite_combos/notification_preferences/
    // tax_exemptions all cascade; order_payments.paid_by_customer_id is
    // SET NULL.
    const result = await pool.query(
      'DELETE FROM customer_profiles WHERE customer_id = $1 RETURNING customer_id',
      [req.user.customer_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }
    return res.status(200).json({ success: true, message: 'Account deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT customer_id, email, password_hash, first_name, last_name FROM customer_profiles WHERE email = $1',
      [email]
    );

    // Same "invalid credentials" message whether the email doesn't exist or
    // is guest-only (no password set) — distinguishing them tells an
    // attacker which emails have registered accounts.
    if (result.rows.length === 0 || !result.rows[0].password_hash) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const customer = result.rows[0];
    const match = await bcrypt.compare(password, customer.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    return res.status(200).json({ success: true, token: signCustomerToken(customer), user: toUser(customer) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
