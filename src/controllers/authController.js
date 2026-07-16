const fs = require('fs');
const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');
// Note: In a production app, use bcrypt to compare hashed passwords!
// const bcrypt = require('bcrypt'); 

const login = async (req, res) => {
    console.log('📬 LOGIN REQUEST RECEIVED FOR:', req.body);
    const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username/email and password are required.' });
  }

try {
   const result = await pool.query(
      'SELECT employee_id, username, password_hash, role FROM employees WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0];


    // 2. Validate password (comparing with password_hash from DB)
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // 3. Sign the JWT, encoding their implicit role!
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'super_secret_key',
      { expiresIn: '12h' }
    );

    // 4. Return the token and the role to the frontend
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role // Tells frontend dashboard whether to redirect to waiter, admin, or kitchen
      }
    });

 } catch (err) {
    // This writes the exact crash details into a file named crash-log.txt
    fs.writeFileSync('crash-log.txt', `CRASH ERROR: ${err.message}\nSTACK: ${err.stack}`);
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
}
};

module.exports = { login };