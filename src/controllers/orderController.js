const pool = require('../config/db').pool;
const menuItemModel = require('../models/menuItemModel');

/**
 * POST /api/orders
 * Creates an order for a menu item and automatically deducts required ingredient stocks
 */
const createOrder = async (req, res) => {
    const client = await pool.connect();

    try {
        const { menu_item_id, quantity } = req.body;
        const orderQuantity = Number(quantity) || 1;

        if (!menu_item_id || orderQuantity <= 0) {
            return res.status(400).json({
                error: 'menu_item_id and a positive quantity are required.'
            });
        }

        // 1. Fetch recipe ingredients mapped to this menu item
        const ingredients = await menuItemModel.getMenuItemIngredients(menu_item_id);

        if (!ingredients || ingredients.length === 0) {
            return res.status(400).json({
                error: `No recipe/ingredients mapped for Menu Item ID ${menu_item_id}.`
            });
        }

        // START TRANSACTION
        await client.query('BEGIN');

        const deductedIngredients = [];

        // 2. Loop through each ingredient, lock row, check stock, and deduct
        for (const ingredient of ingredients) {
            const totalDeductionNeeded = ingredient.quantity_required * orderQuantity;

            // Row-level lock and stock deduction guard clause
            const updateQuery = `
                UPDATE inventory 
                SET stock_quantity = stock_quantity - $1, 
                    updated_at = NOW()
                WHERE id = $2 AND stock_quantity >= $1
                RETURNING id, item_name, stock_quantity, unit;
            `;

            const { rows } = await client.query(updateQuery, [
                totalDeductionNeeded,
                ingredient.inventory_id
            ]);

            // Stock validation check
            if (rows.length === 0) {
                // Rollback transaction instantly if any ingredient lacks stock
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `Insufficient stock for ingredient: "${ingredient.item_name}". Order canceled.`
                });
            }

            deductedIngredients.push({
                inventory_id: rows[0].id,
                item_name: rows[0].item_name,
                deducted_amount: totalDeductionNeeded,
                remaining_stock: rows[0].stock_quantity,
                unit: rows[0].unit
            });
        }

        // COMMIT TRANSACTION
        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Order processed successfully and recipe inventory deducted.',
            menu_item_id: Number(menu_item_id),
            order_quantity: orderQuantity,
            deducted_ingredients: deductedIngredients
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating order:', error);
        return res.status(500).json({ error: 'Internal server error while processing order.' });
    } finally {
        client.release();
    }
};

module.exports = {
    createOrder
};