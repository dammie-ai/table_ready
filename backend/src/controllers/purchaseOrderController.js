const db = require('../config/db');
const pool = db.pool || db;
const { logAudit } = require('../utils/auditLogger');

exports.createSupplier = async (req, res) => {
  try {
    const { name, contact_name, email, phone, address, tax_id, payment_terms, is_active } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Supplier name is required.' });
    }

    const result = await pool.query(
      `INSERT INTO suppliers (name, contact_name, email, phone, address, tax_id, payment_terms, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, contact_name || null, email || null, phone || null, address || null, tax_id || null, payment_terms || null, is_active !== false]
    );

    return res.status(201).json({ success: true, supplier: result.rows[0] });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.getSuppliers = async (req, res) => {
  try {
    const { is_active } = req.query;
    let sql = `SELECT * FROM suppliers WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (is_active !== undefined) {
      sql += ` AND is_active = $${idx++}`;
      params.push(is_active === 'true' || is_active === true);
    }

    sql += ` ORDER BY name`;
    const result = await pool.query(sql, params);
    return res.status(200).json({ success: true, suppliers: result.rows });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_name, email, phone, address, tax_id, payment_terms, is_active } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); params.push(name); }
    if (contact_name !== undefined) { updates.push(`contact_name = $${idx++}`); params.push(contact_name); }
    if (email !== undefined) { updates.push(`email = $${idx++}`); params.push(email); }
    if (phone !== undefined) { updates.push(`phone = $${idx++}`); params.push(phone); }
    if (address !== undefined) { updates.push(`address = $${idx++}`); params.push(address); }
    if (tax_id !== undefined) { updates.push(`tax_id = $${idx++}`); params.push(tax_id); }
    if (payment_terms !== undefined) { updates.push(`payment_terms = $${idx++}`); params.push(payment_terms); }
    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); params.push(is_active); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields provided for update.' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await pool.query(
      `UPDATE suppliers SET ${updates.join(', ')} WHERE supplier_id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Supplier not found.' });
    }

    return res.status(200).json({ success: true, supplier: result.rows[0] });
  } catch (error) {
    console.error('Error updating supplier:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    const { supplier_id, expected_delivery_date, notes, items } = req.body;

    if (!supplier_id || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'supplier_id and items are required.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const poResult = await client.query(
        `INSERT INTO purchase_orders (supplier_id, expected_delivery_date, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4)
         RETURNING purchase_order_id`,
        [supplier_id, expected_delivery_date || null, notes || null, req.user?.id || null]
      );

      const poId = poResult.rows[0].purchase_order_id;
      let totalAmount = 0;

      for (const item of items) {
        const lineTotal = item.quantity_ordered * (item.unit_cost || 0);
        totalAmount += lineTotal;

        await client.query(
          `INSERT INTO purchase_order_items (purchase_order_id, inventory_id, quantity_ordered, unit_cost, line_total, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [poId, item.inventory_id, item.quantity_ordered, item.unit_cost || 0, lineTotal, item.notes || null]
        );
      }

      await client.query(
        `UPDATE purchase_orders SET total_amount = $1 WHERE purchase_order_id = $2`,
        [totalAmount, poId]
      );

      const fullPO = await client.query(
        `SELECT po.*, s.name as supplier_name
         FROM purchase_orders po
         JOIN suppliers s ON po.supplier_id = s.supplier_id
         WHERE po.purchase_order_id = $1`,
        [poId]
      );

      await client.query('COMMIT');
      return res.status(201).json({ success: true, purchase_order: fullPO.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.getPurchaseOrders = async (req, res) => {
  try {
    const { status, supplier_id, start_date, end_date } = req.query;

    let sql = `SELECT po.*, s.name as supplier_name
               FROM purchase_orders po
               JOIN suppliers s ON po.supplier_id = s.supplier_id
               WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (status) {
      sql += ` AND po.status = $${idx++}`;
      params.push(status);
    }
    if (supplier_id) {
      sql += ` AND po.supplier_id = $${idx++}`;
      params.push(supplier_id);
    }
    if (start_date) {
      sql += ` AND po.order_date >= $${idx++}`;
      params.push(start_date);
    }
    if (end_date) {
      sql += ` AND po.order_date <= $${idx++}`;
      params.push(end_date);
    }

    sql += ` ORDER BY po.order_date DESC`;
    const result = await pool.query(sql, params);
    return res.status(200).json({ success: true, purchase_orders: result.rows });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'status is required.' });
    }

    const result = await pool.query(
      `UPDATE purchase_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE purchase_order_id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Purchase order not found.' });
    }

    return res.status(200).json({ success: true, purchase_order: result.rows[0] });
  } catch (error) {
    console.error('Error updating purchase order status:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.receivePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array is required.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const poItems = await client.query(`SELECT * FROM purchase_order_items WHERE purchase_order_id = $1`, [id]);
      if (poItems.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, error: 'Purchase order has no items.' });
      }

      const itemsMap = new Map(items.map(i => [i.purchase_order_item_id, i.quantity_received]));

      for (const poItem of poItems.rows) {
        const received = itemsMap.get(poItem.purchase_order_item_id);
        if (received === undefined) continue;

        await client.query(
          `UPDATE purchase_order_items SET quantity_received = $1, updated_at = CURRENT_TIMESTAMP WHERE purchase_order_item_id = $2`,
          [received, poItem.purchase_order_item_id]
        );

        if (poItem.inventory_id) {
          await client.query(
            `UPDATE inventory SET stock_quantity = COALESCE(stock_quantity, 0) + $1 WHERE id = $2`,
            [received, poItem.inventory_id]
          );
        }
      }

      const receivedCount = await client.query(
        `SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = $1 AND quantity_received > 0`,
        [id]
      );
      const totalCount = await client.query(
        `SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = $1`,
        [id]
      );

      let status = 'received';
      if (receivedCount.rows[0].count < totalCount.rows[0].count) {
        status = 'partially_received';
      }

      await client.query(
        `UPDATE purchase_orders SET status = $1, received_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP WHERE purchase_order_id = $2`,
        [status, id]
      );

      await client.query('COMMIT');

      const updatedPO = await pool.query(`SELECT * FROM purchase_orders WHERE purchase_order_id = $1`, [id]);
      return res.status(200).json({ success: true, purchase_order: updatedPO.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error receiving purchase order:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.createReorderRule = async (req, res) => {
  try {
    const { inventory_id, supplier_id, reorder_quantity, min_quantity, is_enabled } = req.body;

    if (!inventory_id || !reorder_quantity || !min_quantity) {
      return res.status(400).json({ success: false, error: 'inventory_id, reorder_quantity, and min_quantity are required.' });
    }

    const result = await pool.query(
      `INSERT INTO reorder_rules (inventory_id, supplier_id, reorder_quantity, min_quantity, is_enabled)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (inventory_id) DO UPDATE SET
         supplier_id = EXCLUDED.supplier_id,
         reorder_quantity = EXCLUDED.reorder_quantity,
         min_quantity = EXCLUDED.min_quantity,
         is_enabled = EXCLUDED.is_enabled,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [inventory_id, supplier_id || null, reorder_quantity, min_quantity, is_enabled !== false]
    );

    return res.status(200).json({ success: true, reorder_rule: result.rows[0] });
  } catch (error) {
    console.error('Error creating reorder rule:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.getReorderRules = async (req, res) => {
  try {
    const { is_enabled, inventory_id } = req.query;

    let sql = `SELECT r.*, i.item_name as inventory_name, s.name as supplier_name
               FROM reorder_rules r
               LEFT JOIN inventory i ON r.inventory_id = i.id
               LEFT JOIN suppliers s ON r.supplier_id = s.supplier_id
               WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (is_enabled !== undefined) {
      sql += ` AND r.is_enabled = $${idx++}`;
      params.push(is_enabled === 'true' || is_enabled === true);
    }
    if (inventory_id) {
      sql += ` AND r.inventory_id = $${idx++}`;
      params.push(inventory_id);
    }

    sql += ` ORDER BY r.created_at DESC`;
    const result = await pool.query(sql, params);
    return res.status(200).json({ success: true, reorder_rules: result.rows });
  } catch (error) {
    console.error('Error fetching reorder rules:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};

exports.autoReorderCheck = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, i.item_name as inventory_name, s.name as supplier_name, i.stock_quantity
       FROM reorder_rules r
       JOIN inventory i ON r.inventory_id = i.id
       LEFT JOIN suppliers s ON r.supplier_id = s.supplier_id
       WHERE r.is_enabled = TRUE AND i.stock_quantity <= r.min_quantity`
    );

    return res.status(200).json({ success: true, items_to_reorder: result.rows });
  } catch (error) {
    console.error('Error checking reorder rules:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
};
