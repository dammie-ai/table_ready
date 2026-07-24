const menuItemModel = require('../models/menuItemModel');

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

module.exports = {
    addIngredientToMenuItem,
    getMenuItemIngredients,
    removeIngredientFromMenuItem
};