-- Post-checkout customer service ratings, kept separate from
-- sales-based staff performance metrics deliberately — a waiter can be
-- great with customers without being a top seller, and blending the two
-- numbers would make both less useful.
CREATE TABLE IF NOT EXISTS public.service_ratings (
    rating_id SERIAL PRIMARY KEY,
    master_order_id integer NOT NULL REFERENCES public.orders(master_order_id) ON DELETE CASCADE,
    waiter_id integer REFERENCES public.users(id) ON DELETE SET NULL,
    score integer NOT NULL CHECK (score BETWEEN 0 AND 10),
    comment text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT service_ratings_one_per_order UNIQUE (master_order_id)
);

CREATE INDEX IF NOT EXISTS idx_service_ratings_waiter_id ON public.service_ratings(waiter_id);
