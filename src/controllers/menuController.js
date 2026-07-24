const menuItemModel = require('../models/menuItemModel');
const pool = require('../config/db');

/**
 * GET /api/menu
 * Fetch all active menu items for customer browsing
 */
const getMenuItems = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT item_id, name, category_type, description, base_price, image_url, is_trending, prep_time_minutes
       FROM menu_items
       WHERE is_active = true
       ORDER BY category_type, name ASC`
    );

    const items = result.rows.map(item => ({
      ...item,
      base_price: parseFloat(item.base_price)
    }));

    return res.status(200).json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * GET /api/menu/:id
 * Fetch single menu item with ingredients for detail view
 */
const getMenuItemDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const itemRes = await pool.query(
      `SELECT item_id, name, category_type, description, base_price, image_url, is_trending, prep_time_minutes, allergens, custom_sides_array
       FROM menu_items
       WHERE item_id = $1 AND is_active = true`,
      [id]
    );

    if (itemRes.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    const item = itemRes.rows[0];
    item.base_price = parseFloat(item.base_price);

    const ingredients = await menuItemModel.getMenuItemIngredients(id);

    return res.status(200).json({
      success: true,
      item,
      ingredients
    });
  } catch (error) {
    console.error('Error fetching menu item detail:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * POST /api/menu/:id/ingredients
 * Link an ingredient to a menu item or update its quantity
 */
const addIngredientToMenuItem = async (req, res) => {
    try {
        const { id: menuItemId } = req.params;
        const { inventory_id, quantity_required } = req.body;

        if (!inventory_id || !quantity_required || quantity_required <= 0) {
            return res.status(400).json({
                error: 'inventory_id and a positive quantity_required are required.'
            });
        }

        const link = await menuItemModel.addOrUpdateMenuItemIngredient(
            menuItemId,
            inventory_id,
            quantity_required
        );

        return res.status(201).json({
            message: 'Ingredient linked to menu item successfully.',
            data: link
        });
    } catch (error) {
        console.error('Error linking ingredient:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * GET /api/menu/:id/ingredients
 * Get all linked ingredients for a specific menu item
 */
const getMenuItemIngredients = async (req, res) => {
    try {
        const { id: menuItemId } = req.params;
        const ingredients = await menuItemModel.getMenuItemIngredients(menuItemId);

        return res.status(200).json({
            menu_item_id: Number(menuItemId),
            ingredients
        });
    } catch (error) {
        console.error('Error fetching ingredients:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * DELETE /api/menu/:id/ingredients/:inventoryId
 * Remove an ingredient link from a menu item
 */
const removeIngredientFromMenuItem = async (req, res) => {
    try {
        const { id: menuItemId, inventoryId } = req.params;

        const removed = await menuItemModel.removeMenuItemIngredient(menuItemId, inventoryId);

        if (!removed) {
            return res.status(404).json({ error: 'Ingredient link not found.' });
        }

        return res.status(200).json({
            message: 'Ingredient removed from menu item successfully.',
            data: removed
        });
    } catch (error) {
        console.error('Error removing ingredient:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * POST /api/menu
 * Create a new menu item (staff/admin)
 */
const createMenuItem = async (req, res) => {
    try {
        const { name, category_type, description, base_price, stock_quantity, prep_time_minutes, image_url } = req.body;

        if (!name || !category_type || base_price === undefined) {
            return res.status(400).json({ error: 'name, category_type, and base_price are required.' });
        }

        const result = await pool.query(
            `INSERT INTO menu_items (name, category_type, description, base_price, stock_quantity, prep_time_minutes, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [name, category_type, description || null, base_price, stock_quantity || 0, prep_time_minutes || 10, image_url || null]
        );

        const item = result.rows[0];
        item.base_price = parseFloat(item.base_price);

        return res.status(201).json({
            success: true,
            message: 'Menu item created successfully.',
            item
        });
    } catch (error) {
        console.error('Error creating menu item:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * PUT /api/menu/:id
 * Update a menu item (staff/admin)
 */
const updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category_type, description, base_price, stock_quantity, is_active, is_trending, prep_time_minutes, image_url, allergens, custom_sides_array } = req.body;

        const result = await pool.query(
            `UPDATE menu_items
             SET name = COALESCE($1, name),
                 category_type = COALESCE($2, category_type),
                 description = COALESCE($3, description),
                 base_price = COALESCE($4, base_price),
                 stock_quantity = COALESCE($5, stock_quantity),
                 is_active = COALESCE($6, is_active),
                 is_trending = COALESCE($7, is_trending),
                 prep_time_minutes = COALESCE($8, prep_time_minutes),
                 image_url = COALESCE($9, image_url),
                 allergens = COALESCE($10, allergens),
                 custom_sides_array = COALESCE($11, custom_sides_array)
             WHERE item_id = $12
             RETURNING *`,
            [name, category_type, description, base_price, stock_quantity, is_active, is_trending, prep_time_minutes, image_url, allergens, custom_sides_array, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Menu item not found.' });
        }

        const item = result.rows[0];
        item.base_price = parseFloat(item.base_price);

        return res.status(200).json({
            success: true,
            message: 'Menu item updated successfully.',
            item
        });
    } catch (error) {
        console.error('Error updating menu item:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * PATCH /api/menu/:id/toggle
 * Toggle menu item active/inactive (staff/admin)
 */
const toggleMenuItem = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE menu_items SET is_active = NOT is_active WHERE item_id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Menu item not found.' });
        }

        const item = result.rows[0];
        item.base_price = parseFloat(item.base_price);

        return res.status(200).json({
            success: true,
            message: `Menu item is now ${item.is_active ? 'ACTIVE' : 'INACTIVE'}.`,
            item
        });
    } catch (error) {
        console.error('Error toggling menu item:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = {
    getMenuItems,
    getMenuItemDetail,
    addIngredientToMenuItem,
    getMenuItemIngredients,
    removeIngredientFromMenuItem,
    createMenuItem,
    updateMenuItem,
    toggleMenuItem
};