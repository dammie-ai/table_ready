const db = require('../config/db');
const pool = db.pool || db;

exports.sendNotification = async (req, res) => {
  try {
    const { channel, recipient, template_id, subject, body, related_entity_type, related_entity_id } = req.body;

    if (!channel || !recipient || !body) {
      return res.status(400).json({ success: false, error: 'channel, recipient, and body are required.' });
    }

    let resolvedSubject = subject;
    let resolvedBody = body;

    if (template_id) {
      const templateRes = await pool.query(`SELECT * FROM notification_templates WHERE template_id = $1`, [template_id]);
      if (templateRes.rows.length > 0) {
        const template = templateRes.rows[0];
        if (!subject) resolvedSubject = template.subject_template;
        resolvedBody = template.body_template;
      }
    }

    const result = await pool.query(
      `INSERT INTO notification_logs (template_id, channel, recipient, subject, body, status, related_entity_type, related_entity_id)
       VALUES ($1, $2, $3, $4, $5, 'sent', $6, $7)
       RETURNING *`,
      [template_id || null, channel, recipient, resolvedSubject || null, resolvedBody, related_entity_type || null, related_entity_id || null]
    );

    return res.status(201).json({ success: true, notification: result.rows[0] });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.getNotificationTemplates = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM notification_templates ORDER BY event_type, channel`);
    return res.status(200).json({ success: true, templates: result.rows });
  } catch (error) {
    console.error('Error fetching notification templates:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.createNotificationTemplate = async (req, res) => {
  try {
    const { name, channel, event_type, subject_template, body_template } = req.body;

    if (!name || !channel || !event_type || !body_template) {
      return res.status(400).json({ success: false, error: 'name, channel, event_type, and body_template are required.' });
    }

    const result = await pool.query(
      `INSERT INTO notification_templates (name, channel, event_type, subject_template, body_template)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, channel, event_type, subject_template || null, body_template]
    );

    return res.status(201).json({ success: true, template: result.rows[0] });
  } catch (error) {
    console.error('Error creating notification template:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.updateNotificationTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, channel, event_type, subject_template, body_template, is_active } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); params.push(name); }
    if (channel !== undefined) { updates.push(`channel = $${idx++}`); params.push(channel); }
    if (event_type !== undefined) { updates.push(`event_type = $${idx++}`); params.push(event_type); }
    if (subject_template !== undefined) { updates.push(`subject_template = $${idx++}`); params.push(subject_template); }
    if (body_template !== undefined) { updates.push(`body_template = $${idx++}`); params.push(body_template); }
    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); params.push(is_active); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields provided for update.' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await pool.query(
      `UPDATE notification_templates SET ${updates.join(', ')} WHERE template_id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notification template not found.' });
    }

    return res.status(200).json({ success: true, template: result.rows[0] });
  } catch (error) {
    console.error('Error updating notification template:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.getNotificationLogs = async (req, res) => {
  try {
    const { channel, status, recipient, related_entity_type, related_entity_id, limit, offset } = req.query;

    let sql = `SELECT * FROM notification_logs WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (channel) {
      sql += ` AND channel = $${idx++}`;
      params.push(channel);
    }
    if (status) {
      sql += ` AND status = $${idx++}`;
      params.push(status);
    }
    if (recipient) {
      sql += ` AND recipient ILIKE $${idx++}`;
      params.push(`%${recipient}%`);
    }
    if (related_entity_type) {
      sql += ` AND related_entity_type = $${idx++}`;
      params.push(related_entity_type);
    }
    if (related_entity_id) {
      sql += ` AND related_entity_id = $${idx++}`;
      params.push(related_entity_id);
    }

    sql += ` ORDER BY created_at DESC`;

    if (limit) {
      sql += ` LIMIT $${idx++}`;
      params.push(parseInt(limit));
    }
    if (offset) {
      sql += ` OFFSET $${idx++}`;
      params.push(parseInt(offset));
    }

    const result = await pool.query(sql, params);
    return res.status(200).json({ success: true, notifications: result.rows });
  } catch (error) {
    console.error('Error fetching notification logs:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { customer_id, session_token, preferences } = req.body;

    // If no customer_id or session_token in body, try to use authenticated user's customer_id
    const resolvedCustomerId = customer_id || req.user?.customer_id || null;
    const resolvedSessionToken = session_token || null;

    if ((!resolvedCustomerId && !resolvedSessionToken) || !preferences) {
      return res.status(400).json({ success: false, error: 'customer_id or session_token and preferences are required.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const pref of preferences) {
        const { channel, event_type, is_enabled } = pref;
        if (!channel || !event_type || is_enabled === undefined) continue;

        await client.query(
          `INSERT INTO customer_notification_preferences (customer_id, session_token, channel, event_type, is_enabled)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (customer_id, channel, event_type) DO UPDATE SET is_enabled = EXCLUDED.is_enabled`,
          [resolvedCustomerId, resolvedSessionToken, channel, event_type, is_enabled]
        );
      }

      await client.query('COMMIT');
      return res.status(200).json({ success: true, message: 'Notification preferences updated.' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.getNotificationPreferences = async (req, res) => {
  try {
    const { customer_id, session_token } = req.query;

    // If no customer_id or session_token provided, return empty preferences
    if (!customer_id && !session_token) {
      return res.status(200).json({ success: true, preferences: [] });
    }

    let sql = `SELECT * FROM customer_notification_preferences WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (customer_id) {
      sql += ` AND customer_id = $${idx++}`;
      params.push(customer_id);
    }
    if (session_token) {
      sql += ` AND session_token = $${idx++}`;
      params.push(session_token);
    }

    const result = await pool.query(sql, params);
    return res.status(200).json({ success: true, preferences: result.rows });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};
