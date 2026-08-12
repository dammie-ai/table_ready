-- schedules.role only accepted capitalized-with-spaces values ('Manager',
-- 'Assistant Manager', ...) while every other role check in the app
-- (users, user_roles, JWT payloads) uses lowercase_snake_case ('manager',
-- 'assistant_manager'). createSchedule's own validation never restricted
-- the value at all, so a caller following the convention used everywhere
-- else in the API passes validation and then hits a raw DB constraint
-- violation. Widened rather than migrated — employees.role has the same
-- capitalized convention but is seed-only data with no live write path,
-- so it's left alone rather than touched under deadline pressure.
ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_role_check;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_role_check CHECK (
  (role)::text = ANY (ARRAY[
    'Manager', 'Admin', 'Assistant Manager', 'Kitchen', 'Delivery', 'Waiter', 'Other',
    'manager', 'admin', 'assistant_manager', 'kitchen', 'delivery', 'waiter', 'other'
  ]::text[])
);
