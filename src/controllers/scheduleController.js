const db = require('../config/db');
const pool = db.pool || db;
const { logAudit } = require('../utils/auditLogger');

exports.createSchedule = async (req, res) => {
  try {
    const { employee_id, schedule_date, start_time, end_time, role, is_published, notes } = req.body;

    if (!employee_id || !schedule_date || !start_time || !end_time) {
      return res.status(400).json({ success: false, error: 'employee_id, schedule_date, start_time, and end_time are required.' });
    }

    if (start_time >= end_time) {
      return res.status(400).json({ success: false, error: 'start_time must be before end_time.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const scheduleRes = await client.query(
        `INSERT INTO schedules (employee_id, schedule_date, start_time, end_time, role, is_published, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (employee_id, schedule_date) DO UPDATE SET
           start_time = EXCLUDED.start_time,
           end_time = EXCLUDED.end_time,
           role = EXCLUDED.role,
           is_published = EXCLUDED.is_published,
           notes = EXCLUDED.notes,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [employee_id, schedule_date, start_time, end_time, role, is_published !== false, notes || null, req.user?.id || null]
      );

      await client.query('COMMIT');
      return res.status(200).json({ success: true, schedule: scheduleRes.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating schedule:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.getSchedules = async (req, res) => {
  try {
    const { start_date, end_date, employee_id, role, is_published } = req.query;

    let sql = `SELECT s.*, e.name as employee_name, e.role as employee_role
               FROM schedules s
               JOIN employees e ON s.employee_id = e.employee_id
               WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (start_date) {
      sql += ` AND s.schedule_date >= $${idx++}`;
      params.push(start_date);
    }
    if (end_date) {
      sql += ` AND s.schedule_date <= $${idx++}`;
      params.push(end_date);
    }
    if (employee_id) {
      sql += ` AND s.employee_id = $${idx++}`;
      params.push(employee_id);
    }
    if (role) {
      sql += ` AND s.role = $${idx++}`;
      params.push(role);
    }
    if (is_published !== undefined) {
      sql += ` AND s.is_published = $${idx++}`;
      params.push(is_published === 'true' || is_published === true);
    }

    sql += ` ORDER BY s.schedule_date, s.start_time`;

    const result = await pool.query(sql, params);
    return res.status(200).json({ success: true, schedules: result.rows });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_time, end_time, role, is_published, notes, schedule_date } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    if (start_time !== undefined) { updates.push(`start_time = $${idx++}`); params.push(start_time); }
    if (end_time !== undefined) { updates.push(`end_time = $${idx++}`); params.push(end_time); }
    if (role !== undefined) { updates.push(`role = $${idx++}`); params.push(role); }
    if (is_published !== undefined) { updates.push(`is_published = $${idx++}`); params.push(is_published); }
    if (notes !== undefined) { updates.push(`notes = $${idx++}`); params.push(notes); }
    if (schedule_date !== undefined) { updates.push(`schedule_date = $${idx++}`); params.push(schedule_date); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields provided for update.' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await pool.query(
      `UPDATE schedules SET ${updates.join(', ')} WHERE schedule_id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Schedule not found.' });
    }

    return res.status(200).json({ success: true, schedule: result.rows[0] });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM schedules WHERE schedule_id = $1 RETURNING schedule_id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Schedule not found.' });
    }
    return res.status(200).json({ success: true, message: 'Schedule deleted successfully.' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.clockIn = async (req, res) => {
  try {
    const { employee_id } = req.body;
    const userId = req.user?.id;

    if (!employee_id) {
      return res.status(400).json({ success: false, error: 'employee_id is required.' });
    }

    const activeEntry = await pool.query(
      `SELECT * FROM time_entries WHERE employee_id = $1 AND status = 'active' AND clock_out IS NULL`,
      [employee_id]
    );

    if (activeEntry.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Employee is already clocked in. Please clock out first.' });
    }

    const result = await pool.query(
      `INSERT INTO time_entries (employee_id, user_id, clock_in, status, location, ip_address)
       VALUES ($1, $2, CURRENT_TIMESTAMP, 'active', $3, $4)
       RETURNING *`,
      [employee_id, userId, req.body.location || null, req.ip || null]
    );

    return res.status(201).json({ success: true, time_entry: result.rows[0] });
  } catch (error) {
    console.error('Error clocking in:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.clockOut = async (req, res) => {
  try {
    const { employee_id, notes } = req.body;

    if (!employee_id) {
      return res.status(400).json({ success: false, error: 'employee_id is required.' });
    }

    const activeEntry = await pool.query(
      `SELECT * FROM time_entries WHERE employee_id = $1 AND status = 'active' AND clock_out IS NULL`,
      [employee_id]
    );

    if (activeEntry.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No active clock-in found for this employee.' });
    }

    const entry = activeEntry.rows[0];
    const total_hours = Math.round(((new Date() - new Date(entry.clock_in)) / 3600000) * 100) / 100;

    const result = await pool.query(
      `UPDATE time_entries SET clock_out = CURRENT_TIMESTAMP, total_hours = $1, status = 'completed', notes = $2
       WHERE time_entry_id = $3 RETURNING *`,
      [total_hours, notes || null, entry.time_entry_id]
    );

    return res.status(200).json({ success: true, time_entry: result.rows[0] });
  } catch (error) {
    console.error('Error clocking out:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.getTimeEntries = async (req, res) => {
  try {
    const { employee_id, start_date, end_date, status } = req.query;

    let sql = `SELECT t.*, e.name as employee_name, u.username as user_name
               FROM time_entries t
               JOIN employees e ON t.employee_id = e.employee_id
               LEFT JOIN users u ON t.user_id = u.id
               WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (employee_id) {
      sql += ` AND t.employee_id = $${idx++}`;
      params.push(employee_id);
    }
    if (start_date) {
      sql += ` AND CAST(t.clock_in AS DATE) >= $${idx++}`;
      params.push(start_date);
    }
    if (end_date) {
      sql += ` AND CAST(t.clock_in AS DATE) <= $${idx++}`;
      params.push(end_date);
    }
    if (status) {
      sql += ` AND t.status = $${idx++}`;
      params.push(status);
    }

    sql += ` ORDER BY t.clock_in DESC`;

    const result = await pool.query(sql, params);
    return res.status(200).json({ success: true, time_entries: result.rows });
  } catch (error) {
    console.error('Error fetching time entries:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.getMySchedule = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.employee_id) {
      return res.status(400).json({ success: false, error: 'No employee profile linked to this account.' });
    }

    const { start_date, end_date } = req.query;
    const result = await pool.query(
      `SELECT * FROM schedules
       WHERE employee_id = $1
         AND ($2::date IS NULL OR schedule_date >= $2)
         AND ($3::date IS NULL OR schedule_date <= $3)
       ORDER BY schedule_date, start_time`,
      [user.employee_id, start_date || null, end_date || null]
    );

    return res.status(200).json({ success: true, schedules: result.rows });
  } catch (error) {
    console.error('Error fetching my schedule:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};
