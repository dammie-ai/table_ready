-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS (Employee authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'waiter',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. EMPLOYEES (Legacy/admin matrix, kept for future expansion)
CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('Admin', 'Waiter', 'Kitchen', 'Driver')),
    allowed_days_mask INT NOT NULL DEFAULT 127,
    account_lock_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. DINING SESSIONS (Floor management, waiter assignments)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    table_number INT NOT NULL,
    waiter_id INT REFERENCES users(id) ON DELETE SET NULL,
    code VARCHAR(4) DEFAULT NULL,
    party_size INT DEFAULT 1,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    ended_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. RESTAURANT TABLES (Floor map)
CREATE TABLE IF NOT EXISTS restaurant_tables (
    table_id SERIAL PRIMARY KEY,
    table_number INT UNIQUE NOT NULL,
    status_state VARCHAR(30) DEFAULT 'Available' CHECK (status_state IN ('Available', 'Occupied', 'Needs Cleaning', 'Reserved', 'Dirty')),
    active_pin VARCHAR(4) DEFAULT NULL,
    pin_expires_at TIMESTAMP DEFAULT NULL,
    waitlist_queue_array INT[] DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLE SESSIONS (Shared carts / group ordering)
CREATE TABLE IF NOT EXISTS table_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id INT REFERENCES restaurant_tables(table_id) ON DELETE SET NULL,
    is_group_setup BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. INVENTORY
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    reorder_threshold INTEGER NOT NULL DEFAULT 10,
    unit VARCHAR(50) DEFAULT 'units',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. STOCK LOGS
CREATE TABLE IF NOT EXISTS stock_logs (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
    new_quantity INTEGER NOT NULL DEFAULT 0,
    change_amount INTEGER NOT NULL DEFAULT 0,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7a. LOW STOCK ALERTS
CREATE TABLE IF NOT EXISTS low_stock_alerts (
    alert_id SERIAL PRIMARY KEY,
    inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
    current_stock INTEGER NOT NULL,
    threshold INTEGER NOT NULL,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    acknowledged_by INTEGER DEFAULT NULL,
    acknowledged_at TIMESTAMP DEFAULT NULL,
    resolved_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_inventory_id ON low_stock_alerts(inventory_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_status ON low_stock_alerts(status);

-- 8. MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category_type VARCHAR(30) NOT NULL CHECK (category_type IN ('Entree', 'Entrée', 'Meat', 'Fish', 'Dessert', 'Combo')),
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    out_of_stock_flag BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_trending BOOLEAN DEFAULT FALSE,
    prep_time_minutes INT DEFAULT 10,
    allergens VARCHAR(50)[] DEFAULT '{}',
    custom_sides_array JSONB DEFAULT '[]',
    image_url VARCHAR(255) DEFAULT NULL
);

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) DEFAULT NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- 9. MENU ITEM INGREDIENTS (Recipe junction)
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
    id SERIAL PRIMARY KEY,
    menu_item_id INT NOT NULL REFERENCES menu_items(item_id) ON DELETE CASCADE,
    inventory_id INT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    quantity_required NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (quantity_required > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (menu_item_id, inventory_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_menu_id ON menu_item_ingredients(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_inventory_id ON menu_item_ingredients(inventory_id);

-- 10. ORDERS
CREATE TABLE IF NOT EXISTS orders (
    master_order_id SERIAL PRIMARY KEY,
    customer_id INTEGER DEFAULT NULL,
    status VARCHAR(30) DEFAULT 'RECEIVED',
    is_held BOOLEAN DEFAULT FALSE,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    order_type VARCHAR(30) DEFAULT 'IN_HOUSE',
    table_number INT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    progress_percentage INT DEFAULT 0,
    payment_status VARCHAR(30) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Refunded', 'Failed')),
    tax_calculation DECIMAL(10, 2) DEFAULT 0.00,
    tip_value DECIMAL(10, 2) DEFAULT 0.00,
    refund_eligible BOOLEAN DEFAULT TRUE,
    stripe_charge_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id SERIAL PRIMARY KEY,
    master_order_id INT REFERENCES orders(master_order_id) ON DELETE CASCADE,
    item_id INT REFERENCES menu_items(item_id) ON DELETE RESTRICT,
    quantity INT DEFAULT 1,
    ordered_by_user_id INT NOT NULL,
    custom_instructions TEXT,
    has_allergy_alert BOOLEAN DEFAULT FALSE,
    item_status VARCHAR(30) DEFAULT 'Received' CHECK (item_status IN ('Received', 'Preparing', 'Ready', 'Bumped'))
);

-- 12. SETTINGS
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(50) PRIMARY KEY,
    value VARCHAR(255) NOT NULL
);

INSERT INTO settings (key, value) VALUES ('dynamic_pricing_enabled', 'true') ON CONFLICT (key) DO NOTHING;

-- 13. SURGE TIERS
CREATE TABLE IF NOT EXISTS surge_tiers (
    id SERIAL PRIMARY KEY,
    min_orders INT NOT NULL,
    max_orders INT,
    multiplier DECIMAL(4,2) NOT NULL
);

INSERT INTO surge_tiers (min_orders, max_orders, multiplier)
VALUES 
    (0, 10, 1.00),
    (11, 20, 1.10),
    (21, 50, 1.15),
    (51, 65, 0.90),
    (66, 100, 0.85),
    (101, NULL, 0.80)
ON CONFLICT DO NOTHING;

-- 14. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id SERIAL PRIMARY KEY,
    actor_id INTEGER DEFAULT NULL,
    actor_username VARCHAR(100) DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER DEFAULT NULL,
    old_value TEXT DEFAULT NULL,
    new_value TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 15. CARTS
CREATE TABLE IF NOT EXISTS carts (
    cart_id SERIAL PRIMARY KEY,
    customer_id INTEGER DEFAULT NULL,
    session_token VARCHAR(255) DEFAULT NULL,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'checked_out', 'abandoned')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carts_customer_id ON carts(customer_id);
CREATE INDEX IF NOT EXISTS idx_carts_session_token ON carts(session_token);
CREATE INDEX IF NOT EXISTS idx_carts_status ON carts(status);

-- 16. CART ITEMS
CREATE TABLE IF NOT EXISTS cart_items (
    cart_item_id SERIAL PRIMARY KEY,
    cart_id INTEGER NOT NULL REFERENCES carts(cart_id) ON DELETE CASCADE,
    menu_item_id INTEGER DEFAULT NULL REFERENCES menu_items(item_id) ON DELETE CASCADE,
    inventory_id INTEGER DEFAULT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    custom_instructions TEXT DEFAULT NULL,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
