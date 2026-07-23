-- Create the main inventory tracking table (includes base_price for surge calculations)
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

-- Audit log for tracking whenever stock levels change
CREATE TABLE IF NOT EXISTS stock_logs (
  id SERIAL PRIMARY KEY,
  inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
  new_quantity INTEGER NOT NULL DEFAULT 0,
  change_amount INTEGER NOT NULL DEFAULT 0,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Stores order status, type, total amount, and hold state for kitchen routing
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  status VARCHAR(50) DEFAULT 'PENDING',
  order_type VARCHAR(50) DEFAULT 'STANDARD',
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  is_held BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Safely patch existing databases if these columns don't exist yet
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS base_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE stock_logs 
ADD COLUMN IF NOT EXISTS new_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS change_amount INTEGER DEFAULT 0;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS is_held BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Ensure total_amount has a default value set for existing columns
ALTER TABLE orders 
ALTER COLUMN total_amount SET DEFAULT 0.00;

-- Drop old order_type check constraint before updating existing data
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_order_type_check;

-- Clean up any legacy rows with invalid or NULL order_type values
UPDATE orders 
SET order_type = 'STANDARD' 
WHERE order_type IS NULL 
   OR order_type NOT IN ('STANDARD', 'ORDER_FROM_HOME', 'DINE_IN', 'TAKEAWAY');

-- Re-apply updated check constraint allowing ORDER_FROM_HOME
ALTER TABLE orders 
ADD CONSTRAINT orders_order_type_check 
CHECK (order_type IN ('STANDARD', 'ORDER_FROM_HOME', 'DINE_IN', 'TAKEAWAY'));

-- Create system settings table for toggles (e.g., dynamic pricing on/off)
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(50) PRIMARY KEY,
  value VARCHAR(255) NOT NULL
);

-- Initialize default dynamic pricing toggle to 'true' (enabled)
INSERT INTO settings (key, value)
VALUES ('dynamic_pricing_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Create customizable dynamic pricing rules table
CREATE TABLE IF NOT EXISTS surge_tiers (
  id SERIAL PRIMARY KEY,
  min_orders INT NOT NULL,
  max_orders INT, -- NULL represents infinity (e.g., 101+)
  multiplier DECIMAL(4,2) NOT NULL
);

-- Seed initial pricing tiers matching business rules
INSERT INTO surge_tiers (min_orders, max_orders, multiplier)
VALUES 
  (0, 10, 1.00),    -- Standard pricing
  (11, 20, 1.10),   -- +10% Surge
  (21, 50, 1.15),   -- +15% Surge
  (51, 65, 0.90),   -- -10% Volume Discount
  (66, 100, 0.85),  -- -15% Volume Discount
  (101, NULL, 0.80) -- -20% Reverse Surge (101+ orders)
ON CONFLICT DO NOTHING;