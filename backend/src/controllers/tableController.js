const db = require('../config/db');
const pool = db.pool || db;
const { getDeliveryRadius, getGeofenceRadius } = require('../services/configService');
const { isWithinDeliveryRadius } = require('../utils/distance');
const QRCode = require('qrcode');

/**
 * POST /api/tables/verify
 * Verify a table access code (for reserved tables / customer verification)
 */
exports.verifyTableCode = async (req, res) => {
  const { table_number, code } = req.body;

  if (!table_number || !code) {
    return res.status(400).json({ success: false, error: 'table_number and code are required.' });
  }

  try {
    const tableRes = await pool.query(
      `SELECT rt.table_id, rt.status_state, rt.active_pin, rt.pin_expires_at, u.username AS waiter_name
        FROM restaurant_tables rt
        LEFT JOIN users u ON u.id = rt.waiter_id
        WHERE rt.table_number = $1`,
      [table_number]
    );

    if (tableRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found.' });
    }

    const table = tableRes.rows[0];

    if (!table.active_pin) {
      return res.status(400).json({ success: false, error: 'No active PIN set for this table.' });
    }

    if (table.active_pin !== code) {
      return res.status(401).json({ success: false, error: 'Invalid verification code.' });
    }

    if (table.pin_expires_at && new Date() > new Date(table.pin_expires_at)) {
      return res.status(401).json({ success: false, error: 'Verification code expired.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Table verified successfully.',
      table_id: table.table_id,
      waiter_name: table.waiter_name || null
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/tables/floor-layout
 * Get floor layout with table statuses
 */
exports.getFloorLayout = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rt.table_id, rt.table_number, rt.status_state, rt.updated_at, rt.waiter_id, u.username AS waiter_name
       FROM restaurant_tables rt
       LEFT JOIN users u ON u.id = rt.waiter_id
       ORDER BY rt.table_number ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      tables: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PATCH /api/tables/:id/assign-waiter
 * Assign (or unassign, with waiter_id: null) a waiter to a table.
 * Capped at 3 tables per waiter.
 */
exports.assignWaiter = async (req, res) => {
  const { id } = req.params;
  const { waiter_id } = req.body;

  try {
    if (waiter_id !== null && waiter_id !== undefined) {
      const waiterRes = await pool.query(
        `SELECT id, role FROM users WHERE id = $1`,
        [waiter_id]
      );
      if (waiterRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Waiter not found.' });
      }
      if (waiterRes.rows[0].role !== 'waiter') {
        return res.status(400).json({ success: false, error: 'That user is not a waiter.' });
      }

      const countRes = await pool.query(
        `SELECT COUNT(*) FROM restaurant_tables WHERE waiter_id = $1 AND table_id != $2`,
        [waiter_id, id]
      );
      if (Number(countRes.rows[0].count) >= 3) {
        return res.status(400).json({ success: false, error: 'This waiter is already assigned to 3 tables (the max).' });
      }
    }

    const result = await pool.query(
      `UPDATE restaurant_tables SET waiter_id = $1 WHERE table_id = $2 RETURNING table_id, table_number, waiter_id`,
      [waiter_id ?? null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('table_waiter_assigned', result.rows[0]);
    }

    return res.status(200).json({ success: true, table: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/tables/my-tables
 * A waiter's own assigned tables, with their current order status if occupied.
 */
exports.getMyTables = async (req, res) => {
  try {
    const waiterId = req.user.id;

    const result = await pool.query(
      `SELECT
         rt.table_id, rt.table_number, rt.status_state, rt.capacity, rt.section,
         o.master_order_id, o.status AS order_status, o.total_amount, o.payment_status
       FROM restaurant_tables rt
       LEFT JOIN LATERAL (
         SELECT master_order_id, status, total_amount, payment_status
         FROM orders
         WHERE table_number = rt.table_number
           AND status NOT IN ('PICKED_UP', 'CANCELLED', 'COMPLETED')
         ORDER BY master_order_id DESC
         LIMIT 1
       ) o ON true
       WHERE rt.waiter_id = $1
       ORDER BY rt.table_number ASC`,
      [waiterId]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      tables: result.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PATCH /api/tables/:id/status
 * Update table status (staff only)
 */
exports.updateTableStatus = async (req, res) => {
  const { id } = req.params;
  const { status_state } = req.body;

  if (!status_state) {
    return res.status(400).json({ success: false, error: 'status_state is required.' });
  }

  const validStates = ['Available', 'Occupied', 'Needs Cleaning', 'Reserved', 'Dirty'];
  if (!validStates.includes(status_state)) {
    return res.status(400).json({ success: false, error: `Invalid status_state. Must be one of: ${validStates.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `UPDATE restaurant_tables
       SET status_state = $1, updated_at = NOW()
       WHERE table_id = $2
       RETURNING *`,
      [status_state, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('table_status_updated', result.rows[0]);
    }

    return res.status(200).json({
      success: true,
      message: `Table status updated to ${status_state}.`,
      table: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/tables
 * Create a new table (admin only)
 */
exports.createTable = async (req, res) => {
  const { table_number } = req.body;

  if (!table_number) {
    return res.status(400).json({ success: false, error: 'table_number is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO restaurant_tables (table_number, status_state)
       VALUES ($1, 'Available')
       RETURNING *`,
      [table_number]
    );

    return res.status(201).json({
      success: true,
      message: 'Table created.',
      table: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, error: 'Table number already exists.' });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/tables/verify-location
 * Verify if a location is within the restaurant's geofence
 * Used BEFORE ordering and BEFORE QR code scan
 */
exports.verifyLocation = async (req, res) => {
  const { latitude, longitude, check_type = 'delivery' } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ success: false, error: 'latitude and longitude are required.' });
  }

  try {
    if (check_type === 'dine_in' || check_type === 'qr_scan') {
      // Settings' "Geofence Radius (m)" field, not the (much wider)
      // delivery radius — this used to be a hardcoded 0.5mi regardless of
      // what a manager configured.
      const radiusMeters = await getGeofenceRadius();
      const dineInRadiusMiles = radiusMeters / 1609.34;
      const dineInCheck = await isWithinDeliveryRadius(latitude, longitude, dineInRadiusMiles);
      return res.status(200).json({
        success: true,
        allowed: dineInCheck.isAllowed,
        distance_miles: dineInCheck.distanceMiles,
        radius_miles: parseFloat(dineInRadiusMiles.toFixed(2)),
        check_type,
        message: dineInCheck.isAllowed ? 'Location verified for dine-in/QR access.' : `You must be within ${radiusMeters}m of the restaurant to access this feature.`,
      });
    }

    const radiusMiles = await getDeliveryRadius();
    const radiusCheck = await isWithinDeliveryRadius(latitude, longitude, radiusMiles);

    return res.status(200).json({
      success: true,
      allowed: radiusCheck.isAllowed,
      distance_miles: radiusCheck.distanceMiles,
      radius_miles: radiusMiles,
      check_type,
      message: radiusCheck.isAllowed ? 'Location verified for delivery.' : `Delivery unavailable. Your location is ${radiusCheck.distanceMiles} miles away (maximum allowed: ${radiusMiles} miles).`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/tables/qr/generate
 * Generate a QR code for a table session
 */
exports.generateQRCode = async (req, res) => {
  const { table_number, session_id } = req.body;

  if (!table_number && !session_id) {
    return res.status(400).json({ success: false, error: 'table_number or session_id is required.' });
  }

  try {
    let sessionCode = null;
    let tableId = null;

    if (session_id) {
      const sessionRes = await pool.query('SELECT code, table_id FROM sessions WHERE id = $1 AND status = $2', [session_id, 'active']);
      if (sessionRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Session not found or inactive.' });
      }
      sessionCode = sessionRes.rows[0].code;
      tableId = sessionRes.rows[0].table_id;
    } else {
      const tableRes = await pool.query('SELECT table_id, active_pin FROM restaurant_tables WHERE table_number = $1', [table_number]);
      if (tableRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Table not found.' });
      }
      tableId = tableRes.rows[0].table_id;
      sessionCode = tableRes.rows[0].active_pin;
    }

    if (!sessionCode) {
      return res.status(400).json({ success: false, error: 'No active session code found for this table.' });
    }

    // The QR image encodes this URL directly (not a wrapping JSON blob) so
    // any camera app — or this app's own in-browser scanner — can open it
    // straight away. Must match TablePin's own route/query param names.
    const baseUrl = process.env.APP_BASE_URL || 'https://tableready-staff-web.onrender.com';
    const joinUrl = `${baseUrl}/table-pin?table=${table_number}&code=${sessionCode}`;

    const qrImage = await QRCode.toDataURL(joinUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    return res.status(200).json({
      success: true,
      qr_data: joinUrl,
      qr_image: qrImage,
      table_id: tableId,
      table_number: table_number,
      code: sessionCode,
      join_url: joinUrl,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/tables/qr/verify
 * Verify a QR code scan and return table/session info
 * This is called when a customer scans a QR code
 */
exports.verifyQRCode = async (req, res) => {
  const { qr_data, latitude, longitude } = req.body;

  if (!qr_data) {
    return res.status(400).json({ success: false, error: 'qr_data is required.' });
  }

  try {
    let parsed;
    try {
      parsed = JSON.parse(qr_data);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Invalid QR code format.' });
    }

    if (parsed.type !== 'tableready_table') {
      return res.status(400).json({ success: false, error: 'Invalid QR code type.' });
    }

    if (latitude && longitude) {
      const radiusMiles = await getDeliveryRadius();
      const locationCheck = await isWithinDeliveryRadius(latitude, longitude, radiusMiles);
      if (!locationCheck.isAllowed) {
        return res.status(403).json({
          success: false,
          error: `You must be within ${radiusMiles} miles of the restaurant to scan this QR code. You are ${locationCheck.distanceMiles} miles away.`,
          distance_miles: locationCheck.distanceMiles,
        });
      }
    }

    const sessionRes = await pool.query(
      `SELECT s.*, t.table_number, t.status_state as table_status
       FROM sessions s
       JOIN restaurant_tables t ON s.table_number = t.table_number
       WHERE s.code = $1 AND s.status = 'active' AND t.table_id = $2`,
      [parsed.code, parsed.table_id]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found or expired. Please ask your server for a new code.' });
    }

    const session = sessionRes.rows[0];

    return res.status(200).json({
      success: true,
      message: 'QR code verified successfully.',
      session: {
        id: session.id,
        table_id: session.table_id,
        table_number: session.table_number,
        code: session.code,
        party_size: session.party_size,
        waiter_id: session.waiter_id,
        table_status: session.table_status,
        created_at: session.created_at,
      },
      join_url: parsed.url,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  verifyTableCode: exports.verifyTableCode,
  getFloorLayout: exports.getFloorLayout,
  updateTableStatus: exports.updateTableStatus,
  createTable: exports.createTable,
  verifyLocation: exports.verifyLocation,
  generateQRCode: exports.generateQRCode,
  verifyQRCode: exports.verifyQRCode,
  assignWaiter: exports.assignWaiter,
  getMyTables: exports.getMyTables,
};