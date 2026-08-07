-- Destination coordinates captured from the customer's device at checkout
-- time for a DELIVERY order — driver_latitude/driver_longitude already
-- exist on orders, but nothing recorded where the order is actually going,
-- so there was nothing to measure the driver's live position against.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_latitude numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_longitude numeric;
