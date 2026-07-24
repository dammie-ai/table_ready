const db = require('../config/db');

/**
 * Link an ingredient to a menu item (or update its required quantity)
 */
async function addOrUpdateMenuItemIngredient(menuItemId, inventoryId, quantityRequired) {
    const query = `
        INSERT INTO menu_item_ingredients (menu_item_id, inventory_id, quantity_required, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (menu_item_id, inventory_id)
        DO UPDATE SET 
            quantity_required = EXCLUDED.quantity_required,
            updated_at = NOW()
        RETURNING *;
    `;
    const { rows } = await db.query(query, [menuItemId, inventoryId, quantityRequired]);
    return rows[0];
}

/**
 * Get all required ingredients and current inventory levels for a menu item
 */
async function getMenuItemIngredients(menuItemId) {
    const query = `
        SELECT 
            mii.id AS link_id,
            mii.menu_item_id,
            mii.inventory_id,
            mii.quantity_required,
            i.item_name,
            i.stock_quantity,
            i.unit,
            i.is_active
        FROM menu_item_ingredients mii
        JOIN inventory i ON mii.inventory_id = i.id
        WHERE mii.menu_item_id = $1;
    `;
    const { rows } = await db.query(query, [menuItemId]);
    return rows;
}

/**
 * Remove an ingredient link from a menu item
 */
async function removeMenuItemIngredient(menuItemId, inventoryId) {
    const query = `
        DELETE FROM menu_item_ingredients
        WHERE menu_item_id = $1 AND inventory_id = $2
        RETURNING *;
    `;
    const { rows } = await db.query(query, [menuItemId, inventoryId]);
    return rows[0];
}

module.exports = {
    addOrUpdateMenuItemIngredient,
    getMenuItemIngredients,
    removeMenuItemIngredient,
};