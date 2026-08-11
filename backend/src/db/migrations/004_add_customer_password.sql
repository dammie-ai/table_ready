-- Real customer accounts (as opposed to the guest profiles this table was
-- originally built for — is_guest defaults true) need a password. Nullable:
-- existing guest rows have none and stay guests until/unless they register,
-- at which point the same row is upgraded in place rather than duplicated.
ALTER TABLE public.customer_profiles ADD COLUMN IF NOT EXISTS password_hash character varying(255);
