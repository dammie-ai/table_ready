-- Enable UUID generation for secure, unguessable table session IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. WORKER LABOR ACCESS MATRIX
CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('Admin', 'Waiter', 'Kitchen', 'Driver')),
    allowed_days_mask INT NOT NULL DEFAULT 127, -- Binary mask (e.g., 127 = all days)
    account_lock_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. FLOOR & RESERVATION MANAGEMENT
CREATE TABLE IF NOT EXISTS restaurant_tables (
    table_id SERIAL PRIMARY KEY,
    table_number INT UNIQUE NOT NULL,
    status_state VARCHAR(30) DEFAULT 'Available' CHECK (status_state IN ('Available', 'Occupied', 'Needs Cleaning', 'Reserved', 'Dirty')),
    active_pin VARCHAR(4) DEFAULT NULL, -- 4-digit temporary group verification code
    pin_expires_at TIMESTAMP DEFAULT NULL,
    waitlist_queue_array INT[] DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. MENU CONFIGURATION ENGINE
CREATE TABLE IF NOT EXISTS menu_items (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category_type VARCHAR(30) NOT NULL CHECK (category_type IN ('Entrée', 'Meat', 'Fish', 'Dessert', 'Combo')),
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    out_of_stock_flag BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    prep_time_minutes INT DEFAULT 10,
    allergens VARCHAR(50)[] DEFAULT '{}',
    custom_sides_array JSONB DEFAULT '[]'
);

-- 4. TABLE SESSIONS & SHARED CARTS
CREATE TABLE IF NOT EXISTS table_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id INT REFERENCES restaurant_tables(table_id) ON DELETE SET NULL,
    is_group_setup BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. UNIFIED LEDGER HISTORY (Orders)
CREATE TABLE IF NOT EXISTS orders (
    master_order_id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES table_sessions(session_id) ON DELETE SET NULL,
    order_type VARCHAR(30) NOT NULL CHECK (order_type IN ('Dine-In', 'Drive-Thru', 'Delivery', 'Pickup')),
    split_type_applied VARCHAR(30) DEFAULT 'General Split',
    progress_percentage INT DEFAULT 0, -- Used for the 30% refund lock
    refund_eligible BOOLEAN DEFAULT TRUE,
    tax_calculation DECIMAL(10, 2) DEFAULT 0.00,
    tip_value DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(30) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Refunded', 'Failed')),
    stripe_charge_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. ORDER LINE ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id SERIAL PRIMARY KEY,
    master_order_id INT REFERENCES orders(master_order_id) ON DELETE CASCADE,
    item_id INT REFERENCES menu_items(item_id) ON DELETE RESTRICT,
    ordered_by_user_id INT NOT NULL,
    custom_instructions TEXT,
    has_allergy_alert BOOLEAN DEFAULT FALSE,
    item_status VARCHAR(30) DEFAULT 'Received' CHECK (item_status IN ('Received', 'Preparing', 'Ready', 'Bumped'))
);