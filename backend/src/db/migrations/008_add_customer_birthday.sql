-- Foundation for birthday deals down the line -- just capturing the date
-- for now, nothing reads it yet. Nullable since it's optional at signup
-- and plenty of existing customers/guests will never have one on file.
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
