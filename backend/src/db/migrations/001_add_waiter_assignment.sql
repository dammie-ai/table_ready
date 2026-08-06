-- Assigns a table to a specific waiter, so customers can be told who's
-- serving them and waiters can see their own table list. A waiter is
-- capped at 3 tables, enforced in application code (a DB-level count
-- constraint isn't practical without a trigger, and app-level keeps the
-- cap easy to change).
ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS waiter_id integer REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_waiter_id ON public.restaurant_tables(waiter_id);
