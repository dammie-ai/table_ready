const pool = require('../db');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required.' });
  }

  const userRole = role || 'WAITER';

  try {
    const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Username already exists.' });
    }

    const newUser = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, password, userRole]
    );

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      user: newUser.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const user = result.rows[0];
    if (user.password_hash !== password) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'tableready_secret',
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /api/auth/account
 * Protected: Deletes an employee account if they don't have active orders assigned or in-progress
 */
exports.deleteAccount = async (req, res) => {
  const userId = req.user.id;
  let client;

  try {
    client = await pool.connect();

    // 1. Guard check: Ensure employee isn't tied to active/in-progress orders
    const activeOrders = await client.query(
      `SELECT o.master_order_id 
       FROM orders o
       JOIN order_items oi ON o.master_order_id = oi.master_order_id
       WHERE oi.ordered_by_user_id = $1 
         AND o.status NOT IN ('COMPLETED', 'CANCELLED_AND_REFUNDED', 'SERVED')`,
      [userId]
    );

    if (activeOrders.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete staff account while they have active tables or pending order items assigned to them."
      });
    }

    // 2. Delete the staff record
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    return res.status(200).json({
      success: true,
      message: "Employee account successfully removed."
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (client) client.release();
  }
};