-- Migration: Add new columns to existing tables
-- Run this if you already have the old schema applied

-- Add cooking_started_at to order_cook_tracking
ALTER TABLE order_cook_tracking ADD COLUMN IF NOT EXISTS cooking_started_at TIMESTAMP DEFAULT NULL;

-- Add PartiallyPaid to orders payment_status check
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('Pending', 'Paid', 'Refunded', 'Failed', 'PartiallyPaid'));

-- Add idempotency_key to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders(idempotency_key);

-- Add customer_id to orders if missing
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- Ensure menu_items has is_active and image_url
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) DEFAULT NULL;
