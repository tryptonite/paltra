BEGIN;

ALTER TABLE public.order_requests
  ADD COLUMN IF NOT EXISTS new_ship_via TEXT;

COMMIT;
