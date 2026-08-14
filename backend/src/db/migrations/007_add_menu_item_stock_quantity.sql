-- Until now a menu item was either "out of stock" or not -- a plain
-- boolean flag, nothing tracking how much of it is actually left. Kitchen
-- had no way to say "we're down to 3 portions of the salmon" short of
-- flipping the whole item off. Nullable on purpose: NULL means "not
-- tracking a count for this item," distinct from 0 which means "none left."
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS stock_quantity integer;
