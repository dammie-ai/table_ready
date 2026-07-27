-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS (Employee authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'waiter',
    employee_id INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);

-- 2. EMPLOYEES (Legacy/admin matrix, kept for future expansion)
CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('Admin', 'Waiter', 'Kitchen', 'Driver')),
    allowed_days_mask INT NOT NULL DEFAULT 127,
    account_lock_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username);

-- Link users -> employees after both tables exist
ALTER TABLE users ADD CONSTRAINT fk_users_employee_id FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL;

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

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6) DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS verification_attempts INT DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS verification_verified BOOLEAN DEFAULT FALSE;

-- 4. RESTAURANT TABLES (Floor map)
CREATE TABLE IF NOT EXISTS restaurant_tables (
    table_id SERIAL PRIMARY KEY,
    table_number INT UNIQUE NOT NULL,
    status_state VARCHAR(30) DEFAULT 'Available' CHECK (status_state IN ('Available', 'Occupied', 'Needs Cleaning', 'Reserved', 'Dirty')),
    active_pin VARCHAR(4) DEFAULT NULL,
    pin_expires_at TIMESTAMP DEFAULT NULL,
    waitlist_queue_array INT[] DEFAULT '{}',
    capacity INT DEFAULT 4,
    reservation_time TIMESTAMP DEFAULT NULL,
    section VARCHAR(50) DEFAULT 'main',
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
    payment_status VARCHAR(30) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Refunded', 'Failed', 'PartiallyPaid')),
    tax_calculation DECIMAL(10, 2) DEFAULT 0.00,
    tip_value DECIMAL(10, 2) DEFAULT 0.00,
    refund_eligible BOOLEAN DEFAULT TRUE,
    stripe_charge_id VARCHAR(255) DEFAULT NULL,
    idempotency_key VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders(idempotency_key);

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

-- 17. CUSTOMER PROFILES (guest/registered customers)
CREATE TABLE IF NOT EXISTS customer_profiles (
    customer_id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    first_name VARCHAR(100) DEFAULT NULL,
    last_name VARCHAR(100) DEFAULT NULL,
    preferred_language VARCHAR(10) DEFAULT 'en',
    preferred_fulfillment VARCHAR(30) DEFAULT NULL,
    max_delivery_distance_miles INTEGER DEFAULT 10,
    is_guest BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON customer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_phone ON customer_profiles(phone);

-- 18. CUSTOMER SESSIONS (guest tokens / device sessions)
CREATE TABLE IF NOT EXISTS customer_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id INTEGER DEFAULT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
    device_token VARCHAR(255) DEFAULT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer_id ON customer_sessions(customer_id);

-- 19. USER ROLES (multi-role support junction table)
CREATE TABLE IF NOT EXISTS user_roles (
    user_role_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('admin', 'manager', 'kitchen', 'waiter', 'driver')),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- 20. DISH OF THE WEEK CONFIG
CREATE TABLE IF NOT EXISTS dish_of_week_config (
    config_id SERIAL PRIMARY KEY,
    category_type VARCHAR(30) NOT NULL,
    menu_item_id INTEGER DEFAULT NULL REFERENCES menu_items(item_id) ON DELETE SET NULL,
    discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 14.00,
    is_override BOOLEAN DEFAULT FALSE,
    set_by INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    period_start DATE DEFAULT NULL,
    period_end DATE DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dish_of_week_category ON dish_of_week_config(category_type);
CREATE INDEX IF NOT EXISTS idx_dish_of_week_active ON dish_of_week_config(is_active);

-- 21. SERVICE REQUESTS (call server, refill, etc.)
CREATE TABLE IF NOT EXISTS service_requests (
    request_id SERIAL PRIMARY KEY,
    table_number INT NOT NULL,
    session_id UUID DEFAULT NULL REFERENCES table_sessions(session_id) ON DELETE SET NULL,
    request_type VARCHAR(30) NOT NULL CHECK (request_type IN ('call_server', 'refill', 'bill_request', 'other')),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed', 'cancelled')),
    notes TEXT DEFAULT NULL,
    created_by_customer BOOLEAN DEFAULT TRUE,
    acknowledged_by INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP DEFAULT NULL,
    completed_at TIMESTAMP DEFAULT NULL,
    cancelled_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_requests_table ON service_requests(table_number);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);

-- 22. CUSTOMER FAVORITE COMBOS ("The Usual")
CREATE TABLE IF NOT EXISTS customer_favorite_combos (
    combo_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customer_profiles(customer_id) ON DELETE CASCADE,
    combo_name VARCHAR(100) DEFAULT 'The Usual',
    item_ids JSONB NOT NULL DEFAULT '[]',
    quantities JSONB NOT NULL DEFAULT '[]',
    order_count INTEGER DEFAULT 1,
    last_ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_favorite_combos_customer_id ON customer_favorite_combos(customer_id);

-- 23. ORDER DISCOUNT APPLICATIONS (track which discounts were applied to orders)
CREATE TABLE IF NOT EXISTS order_discounts (
    discount_id SERIAL PRIMARY KEY,
    master_order_id INTEGER NOT NULL REFERENCES orders(master_order_id) ON DELETE CASCADE,
    order_item_id INTEGER DEFAULT NULL REFERENCES order_items(order_item_id) ON DELETE SET NULL,
    discount_type VARCHAR(30) NOT NULL CHECK (discount_type IN ('dish_of_week_category', 'dish_of_week_overall', 'promo', 'custom')),
    discount_percentage DECIMAL(5,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    menu_item_id INTEGER DEFAULT NULL REFERENCES menu_items(item_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_discounts_order_id ON order_discounts(master_order_id);

-- 24. WAITLIST ENTRIES
CREATE TABLE IF NOT EXISTS waitlist_entries (
    entry_id SERIAL PRIMARY KEY,
    table_id INT DEFAULT NULL REFERENCES restaurant_tables(table_id) ON DELETE SET NULL,
    customer_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    party_size INT NOT NULL DEFAULT 1,
    status VARCHAR(30) DEFAULT 'waiting' CHECK (status IN ('waiting', 'seated', 'cancelled', 'no_show')),
    pin_code VARCHAR(4) DEFAULT NULL,
    pin_expires_at TIMESTAMP DEFAULT NULL,
    notified_at TIMESTAMP DEFAULT NULL,
    seated_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_waitlist_entries_status ON waitlist_entries(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_entries_table ON waitlist_entries(table_id);

-- 25. COOK TRACKING (per order item cook time tracking)
CREATE TABLE IF NOT EXISTS order_cook_tracking (
    tracking_id SERIAL PRIMARY KEY,
    order_item_id INTEGER NOT NULL REFERENCES order_items(order_item_id) ON DELETE CASCADE,
    master_order_id INTEGER NOT NULL REFERENCES orders(master_order_id) ON DELETE CASCADE,
    estimated_cook_minutes INT NOT NULL DEFAULT 10,
    actual_cook_minutes INT DEFAULT NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'cooking', 'ready', 'held', 'overdue')),
    held_until TIMESTAMP DEFAULT NULL,
    cooking_started_at TIMESTAMP DEFAULT NULL,
    overdue_notified BOOLEAN DEFAULT FALSE,
    overdue_notified_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cook_tracking_order ON order_cook_tracking(master_order_id);
CREATE INDEX IF NOT EXISTS idx_cook_tracking_status ON order_cook_tracking(status);

-- 26. SALES AUDIT CONFIG (customizable schedule)
CREATE TABLE IF NOT EXISTS sales_audit_config (
    config_id SERIAL PRIMARY KEY,
    schedule_type VARCHAR(30) NOT NULL CHECK (schedule_type IN ('once', 'daily', 'every_x_days', 'weekly', 'every_x_weeks', 'monthly', 'every_x_months')),
    interval_value INT DEFAULT 1,
    day_of_week INT DEFAULT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    day_of_month INT DEFAULT NULL CHECK (day_of_month BETWEEN 1 AND 31),
    hour INT DEFAULT 0 CHECK (hour BETWEEN 0 AND 23),
    minute INT DEFAULT 0 CHECK (minute BETWEEN 0 AND 59),
    is_active BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP DEFAULT NULL,
    next_run TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 27. SALES AUDIT RESULTS
CREATE TABLE IF NOT EXISTS sales_audit_results (
    result_id SERIAL PRIMARY KEY,
    config_id INTEGER REFERENCES sales_audit_config(config_id) ON DELETE CASCADE,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    top_item_id INTEGER REFERENCES menu_items(item_id) ON DELETE SET NULL,
    top_item_name VARCHAR(150),
    top_item_quantity INT DEFAULT 0,
    top_item_revenue DECIMAL(10, 2) DEFAULT 0.00,
    total_revenue DECIMAL(10, 2) DEFAULT 0.00,
    total_orders INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_audit_results_config ON sales_audit_results(config_id);
CREATE INDEX IF NOT EXISTS idx_sales_audit_results_period ON sales_audit_results(period_start);

-- 28. RESTAURANT CONFIG (customization)
CREATE TABLE IF NOT EXISTS restaurant_config (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO restaurant_config (config_key, config_value) VALUES
    ('branding', '{"restaurant_name": "TableReady", "logo_url": null, "primary_color": "#1a73e8", "secondary_color": "#ffffff", "font": "system"}'),
    ('business_hours', '{"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "23:00"}, "saturday": {"open": "09:00", "close": "23:00"}, "sunday": {"open": "09:00", "close": "21:00"}}'),
    ('delivery_radius', '{"max_miles": 10}'),
    ('tax_rate', '{"rate": 0.00}'),
    ('order_statuses', '{"IN_HOUSE": {"label": "Dine-In", "color": "#34a853"}, "DRIVE_THRU": {"label": "Drive-Thru", "color": "#ea4335"}, "DELIVERY": {"label": "Delivery", "color": "#fbbc04"}, "ORDER_FROM_HOME": {"label": "Order from Home", "color": "#4285f4"}, "PICKUP": {"label": "Pickup", "color": "#ff6d01"}}')
ON CONFLICT (config_key) DO NOTHING;

-- 29. ORDER PAYMENTS (track split payments)
CREATE TABLE IF NOT EXISTS order_payments (
    payment_id SERIAL PRIMARY KEY,
    master_order_id INTEGER NOT NULL REFERENCES orders(master_order_id) ON DELETE CASCADE,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('stripe', 'cash', 'gift_card', 'other')),
    amount DECIMAL(10, 2) NOT NULL,
    stripe_payment_intent_id VARCHAR(255) DEFAULT NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    paid_by_customer_id INTEGER DEFAULT NULL REFERENCES customer_profiles(customer_id) ON DELETE SET NULL,
    paid_by_user_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(master_order_id);

-- 30. WASTE LOGS
CREATE TABLE IF NOT EXISTS waste_logs (
    waste_id SERIAL PRIMARY KEY,
    inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    reason VARCHAR(255) DEFAULT NULL,
    logged_by INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_waste_logs_inventory_id ON waste_logs(inventory_id);

-- Post-table-creation ALTER statements (moved to end to avoid FK ordering issues)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) DEFAULT NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
