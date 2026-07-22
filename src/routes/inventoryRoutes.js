const express = require('express');
const router = express.Router();
const pool = require('../db'); // Shared PostgreSQL Pool connection

/**
 * POST /api/inventory
 * Process order deductions with transaction safety, row locking, and stock guard validation.
 */
router.post('/', async (req, res) => {
  const { items } = req.body;

  // Validate incoming payload
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Order items array is required.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const processedItems = [];

    for (const item of items) {
      const { inventory_id, quantity } = item;

      if (!inventory_id || !quantity || quantity <= 0) {
        throw new Error('Each item must contain a valid inventory_id and a quantity greater than 0.');
      }

      // 1. Fetch current item state using row-level locking (FOR UPDATE)
      const checkRes = await client.query(
        `SELECT id, item_name, stock_quantity, is_active 
         FROM inventory 
         WHERE id = $1 FOR UPDATE`,
        [inventory_id]
      );

      if (checkRes.rows.length === 0) {
        throw new Error(`Inventory item #${inventory_id} not found.`);
      }

      const currentItem = checkRes.rows[0];

      // Guard Clause 1: Active status and zero stock check
      if (!currentItem.is_active || currentItem.stock_quantity <= 0) {
        throw new Error(`Item "${currentItem.item_name}" is out of stock.`);
      }

      // Guard Clause 2: Check if requested quantity exceeds available inventory
      if (quantity > currentItem.stock_quantity) {
        throw new Error(
          `Cannot fulfill order for "${currentItem.item_name}". Requested quantity (${quantity}) exceeds remaining stock (${currentItem.stock_quantity}).`
        );
      }

      // 2. Compute updated inventory levels
      const newStock = currentItem.stock_quantity - quantity;
      const isStillActive = newStock > 0;

      // 3. Persist updated stock and active state
      const updateRes = await client.query(
        `UPDATE inventory 
         SET stock_quantity = $1, 
             is_active = $2, 
             updated_at = NOW() 
         WHERE id = $3 
         RETURNING *`,
        [newStock, isStillActive, inventory_id]
      );

      processedItems.push(updateRes.rows[0]);
    }

    // Commit transaction only when all items validate and update cleanly
    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Order processed successfully and inventory deducted.',
      deducted_items: processedItems
    });

  } catch (err) {
    // Roll back all changes if any item fails validation or database error occurs
    await client.query('ROLLBACK');
    return res.status(400).json({
      success: false,
      error: err.message
    });

  } finally {
    client.release();
  }
});

/**
 * GET /api/inventory
 * Fetch full inventory list sorted by ID
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY id ASC');
    return res.status(200).json({
      success: true,
      inventory: result.rows
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;