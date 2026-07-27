const pool = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { runSalesAudit, calculateNextRun } = require('../utils/salesAudit');

exports.getConfigs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sales_audit_config ORDER BY config_id ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      configs: result.rows,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.createConfig = async (req, res) => {
  const { schedule_type, interval_value, day_of_week, day_of_month, hour, minute } = req.body;

  if (!schedule_type) {
    return res.status(400).json({
      success: false,
      error: 'schedule_type is required.',
    });
  }

  const validTypes = ['once', 'daily', 'every_x_days', 'weekly', 'every_x_weeks', 'monthly', 'every_x_months'];
  if (!validTypes.includes(schedule_type)) {
    return res.status(400).json({
      success: false,
      error: `Invalid schedule_type. Must be one of: ${validTypes.join(', ')}`,
    });
  }

  try {
    const nextRun = calculateNextRun(schedule_type, interval_value || 1, day_of_week, hour || 0, minute || 0);
    const result = await pool.query(
      `INSERT INTO sales_audit_config (schedule_type, interval_value, day_of_week, day_of_month, hour, minute, is_active, next_run)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       RETURNING *`,
      [schedule_type, interval_value || 1, day_of_week || null, day_of_month || null, hour || 0, minute || 0, nextRun]
    );

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'AUDIT_CONFIG_CREATED',
      entity_type: 'sales_audit_config',
      entity_id: result.rows[0].config_id,
      new_value: JSON.stringify({ schedule_type, interval_value }),
      ip_address: req.ip || req.connection.remoteAddress,
    });

    return res.status(201).json({
      success: true,
      message: 'Audit config created.',
      config: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateConfig = async (req, res) => {
  const { config_id } = req.params;
  const { schedule_type, interval_value, day_of_week, day_of_month, hour, minute, is_active } = req.body;

  try {
    const updatedScheduleType = schedule_type;
    const updatedInterval = interval_value;
    const updatedDayOfWeek = day_of_week;
    const updatedHour = hour;
    const updatedMinute = minute;

    const result = await pool.query(
      `UPDATE sales_audit_config
       SET schedule_type = COALESCE($1, schedule_type),
           interval_value = COALESCE($2, interval_value),
           day_of_week = COALESCE($3, day_of_week),
           day_of_month = COALESCE($4, day_of_month),
           hour = COALESCE($5, hour),
           minute = COALESCE($6, minute),
           is_active = COALESCE($7, is_active),
           updated_at = NOW()
       WHERE config_id = $8
       RETURNING *`,
      [schedule_type, interval_value, day_of_week, day_of_month, hour, minute, is_active, config_id]
    );

    if (result.rows.length > 0 && updatedScheduleType) {
      const updated = result.rows[0];
      const newNextRun = calculateNextRun(updated.schedule_type, updated.interval_value, updated.day_of_week, updated.hour, updated.minute);
      await pool.query(
        `UPDATE sales_audit_config SET next_run = $1 WHERE config_id = $2`,
        [newNextRun, config_id]
      );
      result.rows[0].next_run = newNextRun;
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Audit config not found.' });
    }

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'AUDIT_CONFIG_UPDATED',
      entity_type: 'sales_audit_config',
      entity_id: config_id,
      new_value: JSON.stringify(result.rows[0]),
      ip_address: req.ip || req.connection.remoteAddress,
    });

    return res.status(200).json({
      success: true,
      message: 'Audit config updated.',
      config: result.rows[0],
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteConfig = async (req, res) => {
  const { config_id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM sales_audit_config WHERE config_id = $1 RETURNING *`,
      [config_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Audit config not found.' });
    }

    await logAudit({
      actor_id: req.user?.id || null,
      actor_username: req.user?.username || null,
      action: 'AUDIT_CONFIG_DELETED',
      entity_type: 'sales_audit_config',
      entity_id: config_id,
      ip_address: req.ip || req.connection.remoteAddress,
    });

    return res.status(200).json({
      success: true,
      message: 'Audit config deleted.',
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.runAudit = async (req, res) => {
  const { config_id } = req.params;

  try {
    const configRes = await pool.query(
      `SELECT * FROM sales_audit_config WHERE config_id = $1`,
      [config_id]
    );

    if (configRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Audit config not found.' });
    }

    const result = await runSalesAudit(configRes.rows[0]);

    return res.status(200).json({
      success: true,
      message: 'Audit run completed.',
      result,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getResults = async (req, res) => {
  const { config_id } = req.query;

  try {
    let query = `SELECT * FROM sales_audit_results`;
    const params = [];
    let paramCount = 0;

    if (config_id) {
      paramCount++;
      query += ` WHERE config_id = $${paramCount}`;
      params.push(config_id);
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      results: result.rows,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};