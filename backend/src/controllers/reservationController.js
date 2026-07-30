const db = require('../config/db');
const pool = db.pool || db;
const { logAudit } = require('../utils/auditLogger');

exports.createReservation = async (req, res) => {
  const { customer_name, customer_phone, customer_email, table_id, reservation_date, reservation_time, party_size, notes } = req.body;

  if (!customer_name || !reservation_date || !reservation_time || !party_size) {
    return res.status(400).json({
      success: false,
      error: 'customer_name, reservation_date, reservation_time, and party_size are required.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tableRes = await client.query(
      `SELECT table_id, capacity, status_state FROM restaurant_tables WHERE table_id = $1`,
      [table_id || null]
    );

    if (table_id && tableRes.rows.length > 0) {
      const table = tableRes.rows[0];
      if (table.capacity < party_size) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: `Table #${table_id} capacity (${table.capacity}) is less than party size (${party_size}).`
        });
      }
    }

    const result = await client.query(
      `INSERT INTO reservations (customer_name, customer_phone, customer_email, table_id, reservation_date, reservation_time, party_size, notes, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [customer_name, customer_phone || null, customer_email || null, table_id || null, reservation_date, reservation_time, party_size, notes || null, req.user?.id || null]
    );

    await client.query('COMMIT');

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'RESERVATION_CREATED',
      entity_type: 'reservation',
      entity_id: result.rows[0].reservation_id,
      new_value: JSON.stringify({ customer_name, reservation_date, reservation_time, party_size, table_id }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(201).json({
      success: true,
      message: 'Reservation created successfully.',
      reservation: result.rows[0]
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (client) client.release();
  }
};

exports.getReservations = async (req, res) => {
  const { date, status, table_id } = req.query;

  try {
    let query = `SELECT r.*, t.table_number, t.capacity, u.username as created_by_name
                 FROM reservations r
                 LEFT JOIN restaurant_tables t ON r.table_id = t.table_id
                 LEFT JOIN users u ON r.created_by_user_id = u.id
                 WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (date) {
      paramCount++;
      query += ` AND r.reservation_date = $${paramCount}`;
      params.push(date);
    }

    if (status) {
      paramCount++;
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
    }

    if (table_id) {
      paramCount++;
      query += ` AND r.table_id = $${paramCount}`;
      params.push(table_id);
    }

    query += ` ORDER BY r.reservation_date DESC, r.reservation_time ASC LIMIT 100`;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      reservations: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getReservationById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT r.*, t.table_number, t.capacity, u.username as created_by_name
       FROM reservations r
       LEFT JOIN restaurant_tables t ON r.table_id = t.table_id
       LEFT JOIN users u ON r.created_by_user_id = u.id
       WHERE r.reservation_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Reservation not found.' });
    }

    return res.status(200).json({
      success: true,
      reservation: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateReservation = async (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_phone, customer_email, table_id, reservation_date, reservation_time, party_size, status, notes } = req.body;

  try {
    const existing = await pool.query(`SELECT * FROM reservations WHERE reservation_id = $1`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Reservation not found.' });
    }

    const result = await pool.query(
      `UPDATE reservations
       SET customer_name = COALESCE($1, customer_name),
           customer_phone = COALESCE($2, customer_phone),
           customer_email = COALESCE($3, customer_email),
           table_id = COALESCE($4, table_id),
           reservation_date = COALESCE($5, reservation_date),
           reservation_time = COALESCE($6, reservation_time),
           party_size = COALESCE($7, party_size),
           status = COALESCE($8, status),
           notes = COALESCE($9, notes),
           updated_at = NOW()
       WHERE reservation_id = $10
       RETURNING *`,
      [customer_name, customer_phone, customer_email, table_id, reservation_date, reservation_time, party_size, status, notes, id]
    );

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'RESERVATION_UPDATED',
      entity_type: 'reservation',
      entity_id: parseInt(id),
      new_value: JSON.stringify(result.rows[0]),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: 'Reservation updated successfully.',
      reservation: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.cancelReservation = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE reservations
       SET status = 'cancelled', updated_at = NOW()
       WHERE reservation_id = $1 AND status IN ('confirmed', 'seated')
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Reservation not found or cannot be cancelled.' });
    }

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'RESERVATION_CANCELLED',
      entity_type: 'reservation',
      entity_id: parseInt(id),
      old_value: JSON.stringify({ status: 'confirmed' }),
      new_value: JSON.stringify({ status: 'cancelled' }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully.',
      reservation: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.seatReservation = async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const reservation = await client.query(
      `SELECT * FROM reservations WHERE reservation_id = $1 FOR UPDATE`,
      [id]
    );

    if (reservation.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Reservation not found.' });
    }

    if (reservation.rows[0].status !== 'confirmed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Reservation is not in confirmed status.' });
    }

    const updatedReservation = await client.query(
      `UPDATE reservations
       SET status = 'seated', updated_at = NOW()
       WHERE reservation_id = $1
       RETURNING *`,
      [id]
    );

    if (reservation.rows[0].table_id) {
      await client.query(
        `UPDATE restaurant_tables
         SET status_state = 'Occupied', updated_at = NOW()
         WHERE table_id = $1`,
        [reservation.rows[0].table_id]
      );
    }

    await client.query('COMMIT');

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'RESERVATION_SEATED',
      entity_type: 'reservation',
      entity_id: parseInt(id),
      new_value: JSON.stringify({ status: 'seated', table_id: reservation.rows[0].table_id }),
      ip_address: req.ip || req.connection.remoteAddress
    });

    return res.status(200).json({
      success: true,
      message: 'Reservation marked as seated.',
      reservation: updatedReservation.rows[0]
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (client) client.release();
  }
};

exports.getReservationsForDate = async (req, res) => {
  const { date } = req.params;

  if (!date) {
    return res.status(400).json({ success: false, error: 'date path parameter is required (YYYY-MM-DD).' });
  }

  try {
    const result = await pool.query(
      `SELECT r.*, t.table_number, t.capacity
       FROM reservations r
       LEFT JOIN restaurant_tables t ON r.table_id = t.table_id
       WHERE r.reservation_date = $1
       ORDER BY r.reservation_time ASC`,
      [date]
    );

    const tableStats = await pool.query(
      `SELECT t.table_id, t.table_number, t.capacity,
              COUNT(r.reservation_id) AS reservation_count
       FROM restaurant_tables t
       LEFT JOIN reservations r ON t.table_id = r.table_id AND r.reservation_date = $1 AND r.status = 'confirmed'
       GROUP BY t.table_id, t.table_number, t.capacity
       ORDER BY t.table_number ASC`,
      [date]
    );

    return res.status(200).json({
      success: true,
      date: date,
      reservations: result.rows,
      table_availability: tableStats.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
