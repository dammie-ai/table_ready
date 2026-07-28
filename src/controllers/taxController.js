const db = require('../config/db');
const pool = db.pool || db;

exports.createTaxJurisdiction = async (req, res) => {
  try {
    const { name, jurisdiction_type, parent_jurisdiction_id, code, is_active, effective_date, end_date } = req.body;

    if (!name || !jurisdiction_type) {
      return res.status(400).json({ success: false, error: 'name and jurisdiction_type are required.' });
    }

    const result = await pool.query(
      `INSERT INTO tax_jurisdictions (name, jurisdiction_type, parent_jurisdiction_id, code, is_active, effective_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, jurisdiction_type, parent_jurisdiction_id || null, code || null, is_active !== false, effective_date || null, end_date || null]
    );

    return res.status(201).json({ success: true, jurisdiction: result.rows[0] });
  } catch (error) {
    console.error('Error creating tax jurisdiction:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.getTaxJurisdictions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM tax_jurisdictions ORDER BY jurisdiction_type, name`
    );
    return res.status(200).json({ success: true, jurisdictions: result.rows });
  } catch (error) {
    console.error('Error fetching tax jurisdictions:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.createTaxRate = async (req, res) => {
  try {
    const { jurisdiction_id, name, rate_percentage, applies_to, is_tax_inclusive, is_active, effective_date, end_date } = req.body;

    if (!jurisdiction_id || !name || rate_percentage === undefined) {
      return res.status(400).json({ success: false, error: 'jurisdiction_id, name, and rate_percentage are required.' });
    }

    const result = await pool.query(
      `INSERT INTO tax_rates (jurisdiction_id, name, rate_percentage, applies_to, is_tax_inclusive, is_active, effective_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [jurisdiction_id, name, rate_percentage, applies_to || 'all', is_tax_inclusive || false, is_active !== false, effective_date || null, end_date || null]
    );

    return res.status(201).json({ success: true, tax_rate: result.rows[0] });
  } catch (error) {
    console.error('Error creating tax rate:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.getTaxRates = async (req, res) => {
  try {
    const { jurisdiction_id, is_active } = req.query;

    let sql = `SELECT tr.*, tj.name as jurisdiction_name, tj.code as jurisdiction_code
               FROM tax_rates tr
               JOIN tax_jurisdictions tj ON tr.jurisdiction_id = tj.tax_jurisdiction_id
               WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (jurisdiction_id) {
      sql += ` AND tr.jurisdiction_id = $${idx++}`;
      params.push(jurisdiction_id);
    }
    if (is_active !== undefined) {
      sql += ` AND tr.is_active = $${idx++}`;
      params.push(is_active === 'true' || is_active === true);
    }

    sql += ` ORDER BY tr.effective_date DESC`;
    const result = await pool.query(sql, params);
    return res.status(200).json({ success: true, tax_rates: result.rows });
  } catch (error) {
    console.error('Error fetching tax rates:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.calculateOrderTax = async (req, res) => {
  try {
    const { order_id } = req.params;

    const orderRes = await pool.query(`SELECT * FROM orders WHERE order_id = $1`, [order_id]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }
    const order = orderRes.rows[0];

    const taxRates = await pool.query(
      `SELECT tr.*, tj.name as jurisdiction_name
       FROM tax_rates tr
       JOIN tax_jurisdictions tj ON tr.jurisdiction_id = tj.tax_jurisdiction_id
       WHERE tr.is_active = TRUE
         AND (tr.effective_date IS NULL OR tr.effective_date <= CURRENT_DATE)
         AND (tr.end_date IS NULL OR tr.end_date >= CURRENT_DATE)`
    );

    let subtotal = parseFloat(order.total_amount) || 0;
    let totalTax = 0;
    const taxDetails = [];

    for (const rate of taxRates.rows) {
      let taxableAmount = subtotal;
      if (rate.applies_to !== 'all') {
        taxableAmount = 0;
      }
      const taxAmount = Math.round(taxableAmount * parseFloat(rate.rate_percentage) * 100) / 100;
      totalTax += taxAmount;
      taxDetails.push({
        jurisdiction_name: rate.jurisdiction_name,
        tax_rate: parseFloat(rate.rate_percentage),
        taxable_amount: taxableAmount,
        tax_amount: taxAmount
      });
    }

    return res.status(200).json({
      success: true,
      order_id,
      subtotal,
      tax_inclusive: order.tax_inclusive || false,
      tax_rates_applied: taxDetails,
      total_tax: Math.round(totalTax * 100) / 100,
      grand_total: Math.round((subtotal + totalTax) * 100) / 100
    });
  } catch (error) {
    console.error('Error calculating order tax:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.createTaxExemption = async (req, res) => {
  try {
    const { customer_id, organization_name, exemption_number, jurisdiction_id, expires_at } = req.body;

    if (!organization_name || !exemption_number || !jurisdiction_id) {
      return res.status(400).json({ success: false, error: 'organization_name, exemption_number, and jurisdiction_id are required.' });
    }

    const result = await pool.query(
      `INSERT INTO tax_exemptions (customer_id, organization_name, exemption_number, jurisdiction_id, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [customer_id || null, organization_name, exemption_number, jurisdiction_id, expires_at || null]
    );

    return res.status(201).json({ success: true, exemption: result.rows[0] });
  } catch (error) {
    console.error('Error creating tax exemption:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.getTaxExemptions = async (req, res) => {
  try {
    const { customer_id, jurisdiction_id } = req.query;

    let sql = `SELECT * FROM tax_exemptions WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (customer_id) {
      sql += ` AND customer_id = $${idx++}`;
      params.push(customer_id);
    }
    if (jurisdiction_id) {
      sql += ` AND jurisdiction_id = $${idx++}`;
      params.push(jurisdiction_id);
    }

    sql += ` ORDER BY created_at DESC`;
    const result = await pool.query(sql, params);
    return res.status(200).json({ success: true, exemptions: result.rows });
  } catch (error) {
    console.error('Error fetching tax exemptions:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};
