-- order_items.master_order_id has no index despite being joined in nearly
-- every order-fetching query in the app (kitchen board, order tracking,
-- receipts, analytics) — a foreseeable performance cliff as order volume
-- grows. item_id is indexed too since it's joined against menu_items in
-- the same queries just as often.
CREATE INDEX IF NOT EXISTS idx_order_items_master_order_id ON public.order_items(master_order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_id ON public.order_items(item_id);
