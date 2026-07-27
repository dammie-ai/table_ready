-- Migration: Create waste_logs table
-- Run this if you already have the old schema applied

CREATE TABLE IF NOT EXISTS waste_logs (
    waste_id SERIAL PRIMARY KEY,
    inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    reason VARCHAR(255) DEFAULT NULL,
    logged_by INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_waste_logs_inventory_id ON waste_logs(inventory_id);
