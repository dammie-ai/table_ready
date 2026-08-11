const db = require('../config/db');
const pool = db.pool || db;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { logAudit } = require('../utils/auditLogger');

exports.register = async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ success: false, error: 'Username, password, and role are required.' });
  }

  try {
    const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Username already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, passwordHash, role]
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

    const staffRoles = ['waiter', 'kitchen', 'delivery', 'assistant_manager', 'other'];
    if (staffRoles.includes(user.role)) {
      if (user.employee_id) {
        const empRes = await pool.query(
          `SELECT e.employee_id, e.name, e.allowed_days_mask, e.account_lock_status
           FROM employees e
           WHERE e.employee_id = $1`,
          [user.employee_id]
        );

        if (empRes.rows.length > 0) {
          const employee = empRes.rows[0];

          if (employee.account_lock_status) {
            return res.status(403).json({
              success: false,
              error: 'Account is locked. Contact an administrator to unlock your account.',
            });
          }

          const today = new Date().getDay();
          const dayMask = 1 << today;
          const worksToday = (employee.allowed_days_mask & dayMask) !== 0;

          if (!worksToday) {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return res.status(403).json({
              success: false,
              error: `You are not scheduled to work today (${dayNames[today]}). You cannot log in on your day off.`,
            });
          }
        }
      } else if (user.username) {
        const fallbackRes = await pool.query(
          `SELECT e.employee_id, e.name, e.allowed_days_mask, e.account_lock_status
           FROM employees e
           WHERE e.username = $1
           LIMIT 1`,
          [user.username]
        );

        if (fallbackRes.rows.length > 0) {
          const employee = fallbackRes.rows[0];

          if (employee.account_lock_status) {
            return res.status(403).json({
              success: false,
              error: 'Account is locked. Contact an administrator to unlock your account.',
            });
          }

          const today = new Date().getDay();
          const dayMask = 1 << today;
          const worksToday = (employee.allowed_days_mask & dayMask) !== 0;

          if (!worksToday) {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return res.status(403).json({
              success: false,
              error: `You are not scheduled to work today (${dayNames[today]}). You cannot log in on your day off.`,
            });
          }
        }
      }
    }

    const rolesRes = await pool.query('SELECT role FROM user_roles WHERE user_id = $1', [user.id]);
    const roles = rolesRes.rows.length > 0 ? rolesRes.rows.map(r => r.role) : [user.role];

    const token = jwt.sign(
      { id: user.id, roles, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: { id: user.id, username: user.username, roles }
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

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'USER_DELETED',
      entity_type: 'user',
      entity_id: userId,
      ip_address: req.ip || req.connection.remoteAddress
    });

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
