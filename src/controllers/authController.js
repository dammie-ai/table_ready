const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username/email and password are required.' });
  }

  try {
    // 1. Query the 'employees' table, making sure to fetch 'allowed_days_mask'
    const result = await pool.query(
      'SELECT employee_id, name, password_hash, role, allowed_days_mask FROM employees WHERE name = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0];

    // --- EMPLOYEE SHIFT CHECKER (TAB-27) ---
    // JavaScript's getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday
    const todayDayIndex = new Date().getDay(); 
    const isScheduledToday = (user.allowed_days_mask & (1 << todayDayIndex)) !== 0;

    if (!isScheduledToday) {
      return res.status(403).json({ 
        error: 'Access denied. You are not scheduled to work today.' 
      });
    }
    // ----------------------------------------

    // 2. Validate password (using password_hash from DB)
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // 3. Generate JWT Token using employee_id and role
    const token = jwt.sign(
      { id: user.employee_id, role: user.role },
      process.env.JWT_SECRET || 'super_secret_key',
      { expiresIn: '12h' }
    );

    // 4. Return the token and user data to the frontend
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.employee_id,
        username: user.name,
        role: user.role
      }
    });

  } catch (err) {
    fs.writeFileSync('crash-log.txt', `CRASH ERROR: ${err.message}\nSTACK: ${err.stack}`);
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
};

module.exports = { login };