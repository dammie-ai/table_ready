-- Create menu_item_ingredients junction table
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
    id SERIAL PRIMARY KEY,
    menu_item_id INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    inventory_id INT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    quantity_required NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (quantity_required > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate ingredient mappings for the same menu item
    UNIQUE (menu_item_id, inventory_id)
);

-- Index for fast lookup during order placement checks
CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_menu_id 
ON menu_item_ingredients(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_inventory_id 
ON menu_item_ingredients(inventory_id);