-- Migration: Add pickup-specific fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_scheduled_time TIMESTAMP DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_actual_time TIMESTAMP DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_vehicle VARCHAR(100) DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS curbside_lane VARCHAR(50) DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_held_until_arrival BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_code VARCHAR(6) DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_notified BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_orders_pickup_scheduled_time ON orders(pickup_scheduled_time);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_code ON orders(pickup_code);
