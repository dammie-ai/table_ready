const pool = require('../config/db');
const bcrypt = require('bcrypt');
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

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, passwordHash, userRole]
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
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
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

exports.deleteAccount = async (req, res) => {
  const userId = req.user.id;
  let client;

  try {
    client = await pool.connect();

    const activeOrders = await client.query(
      `SELECT o.master_order_id 
       FROM orders o
       JOIN order_items oi ON o.master_order_id = oi.master_order_id
       WHERE oi.ordered_by_user_id = $1 
         AND o.status NOT IN ('COMPLETED', 'CANCELLED', 'SERVED')`,
      [userId]
    );

    if (activeOrders.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete staff account while they have active tables or pending order items assigned to them."
      });
    }

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
