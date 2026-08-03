const db = require('../config/db');
const pool = db.pool || db;
const { getDeliveryRadius } = require('../services/configService');
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
      `SELECT table_id, status_state, active_pin, pin_expires_at
        FROM restaurant_tables
        WHERE table_number = $1`,
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
      table_id: table.table_id
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
      `SELECT table_id, table_number, status_state, updated_at
       FROM restaurant_tables
       ORDER BY table_number ASC`
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
    const radiusMiles = await getDeliveryRadius();
    const radiusCheck = isWithinDeliveryRadius(latitude, longitude, radiusMiles);

    if (check_type === 'dine_in' || check_type === 'qr_scan') {
      const DINE_IN_RADIUS = 0.5;
      const dineInCheck = isWithinDeliveryRadius(latitude, longitude, DINE_IN_RADIUS);
      return res.status(200).json({
        success: true,
        allowed: dineInCheck.isAllowed,
        distance_miles: dineInCheck.distanceMiles,
        radius_miles: DINE_IN_RADIUS,
        check_type,
        message: dineInCheck.isAllowed ? 'Location verified for dine-in/QR access.' : `You must be within ${DINE_IN_RADIUS} mile(s) of the restaurant to access this feature.`,
      });
    }

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

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const qrData = JSON.stringify({
      type: 'tableready_table',
      table_id: tableId,
      table_number: table_number,
      code: sessionCode,
      url: `${baseUrl}/join?code=${sessionCode}&table=${table_number}`,
    });

    const qrImage = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    return res.status(200).json({
      success: true,
      qr_data: qrData,
      qr_image: qrImage,
      table_id: tableId,
      table_number: table_number,
      code: sessionCode,
      join_url: `${baseUrl}/join?code=${sessionCode}&table=${table_number}`,
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
      const locationCheck = isWithinDeliveryRadius(latitude, longitude, 0.5);
      if (!locationCheck.isAllowed) {
        return res.status(403).json({
          success: false,
          error: `You must be within 0.5 miles of the restaurant to scan this QR code. You are ${locationCheck.distanceMiles} miles away.`,
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
};