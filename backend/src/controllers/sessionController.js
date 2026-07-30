const db = require('../config/db');
const pool = db.pool || db;
const { autoSeatWaitlistForTable } = require('../utils/autoSeatWaitlist');

// POST /api/sessions/check-shift
// Verifies whether a given user exists, holds the waiter role, and is scheduled to work today
const checkEmployeeShift = async (req, res) => {
  const { waiter_id } = req.body;

  if (!waiter_id) {
    return res.status(400).json({ success: false, error: 'waiter_id is required to check shift status.' });
  }

  try {
    const userRes = await pool.query(
      `SELECT id, username, role, employee_id FROM users WHERE id = $1`,
      [waiter_id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Waiter not found.' });
    }

    const waiter = userRes.rows[0];

    if (waiter.role !== 'waiter') {
      return res.status(400).json({
        success: false,
        error: `User ${waiter.username} is not registered as a waiter.`,
      });
    }

    const empRes = await pool.query(
      `SELECT e.employee_id, e.name, e.allowed_days_mask, e.account_lock_status
       FROM employees e
       WHERE e.employee_id = $1`,
      [waiter.employee_id]
    );

    let employee = empRes.rows[0] || null;

    if (!employee && waiter.username) {
      const fallbackRes = await pool.query(
        `SELECT e.employee_id, e.name, e.allowed_days_mask, e.account_lock_status
         FROM employees e
         WHERE e.username = $1
         LIMIT 1`,
        [waiter.username]
      );
      employee = fallbackRes.rows[0] || null;
    }

    if (employee) {
      if (employee.account_lock_status) {
        return res.status(403).json({
          success: false,
          error: `Account is locked. Contact an administrator to unlock your account.`,
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

    return res.status(200).json({
      success: true,
      on_shift: true,
      message: `Waiter ${waiter.username} is valid and ready for assignment.`,
      waiter: waiter,
    });
  } catch (err) {
    console.error('Error checking employee shift:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// POST /api/sessions
// Creates a new dining session assigned to a waiter and table
const createSession = async (req, res) => {
  const { table_number, waiter_id, party_size } = req.body;

  if (!table_number || !waiter_id) {
    return res.status(400).json({ success: false, error: 'table_number and waiter_id are required.' });
  }

  // Generate a random 4-digit access code
  const code = Math.floor(1000 + Math.random() * 9000).toString();

  try {
    const query = `
      INSERT INTO sessions (table_number, waiter_id, code, party_size, status)
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING *
    `;
    const result = await pool.query(query, [
      table_number,
      waiter_id,
      code,
      party_size || 1
    ]);

    return res.status(201).json({ success: true, ...result.rows[0] });
  } catch (err) {
    console.error('Error creating session:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// GET /api/sessions
// Retrieves active dining sessions
const getActiveSessions = async (req, res) => {
  try {
    const query = `
      SELECT * FROM sessions
      WHERE status = 'active'
    `;
    const result = await pool.query(query);
    return res.status(200).json({ success: true, sessions: result.rows });
  } catch (err) {
    console.error('Error fetching active sessions:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// PUT /api/sessions/:id/close
// Closes an active session
const closeSession = async (req, res) => {
  const { id } = req.params;

  try {
    const sessionQuery = `
      UPDATE sessions
      SET status = 'closed', ended_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const sessionResult = await pool.query(sessionQuery, [id]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }

    const session = sessionResult.rows[0];

    await pool.query(
      `UPDATE restaurant_tables
       SET status_state = 'Available', active_pin = NULL, pin_expires_at = NULL, updated_at = NOW()
       WHERE table_number = $1`,
      [session.table_number]
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('table_status_updated', {
        table_number: session.table_number,
        status_state: 'Available',
        updated_at: new Date().toISOString(),
      });
    }

    await autoSeatWaitlistForTable(io, session.table_number);

    return res.status(200).json({ success: true, ...session });
  } catch (err) {
    console.error('Error closing session:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// POST /api/sessions/join
// Join an active table session by 4-digit code
const joinSessionByCode = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, error: 'code is required.' });
  }

  try {
    const sessionRes = await pool.query(
      `SELECT * FROM sessions WHERE code = $1 AND status = 'active'`,
      [code]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired session code.' });
    }

    const session = sessionRes.rows[0];

    const tableRes = await pool.query(
      `SELECT table_id, table_number, status_state FROM restaurant_tables WHERE table_number = $1`,
      [session.table_number]
    );

    return res.status(200).json({
      success: true,
      message: 'Joined table session successfully.',
      session: {
        id: session.id,
        table_number: session.table_number,
        party_size: session.party_size,
        waiter_id: session.waiter_id,
        created_at: session.created_at,
      },
      table: tableRes.rows[0] || null,
    });
  } catch (err) {
    console.error('Error joining session:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

module.exports = {
  checkEmployeeShift,
  createSession,
  getActiveSessions,
  closeSession,
  joinSessionByCode
};