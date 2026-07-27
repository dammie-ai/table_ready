-- Migration: Create order_payments table
-- Run this if you already have the old schema applied

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
