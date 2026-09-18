-- Preserve existing combined values in order_number; do not guess their meaning.
BEGIN;
ALTER TABLE public.order_requests
  ADD COLUMN IF NOT EXISTS control_number TEXT,
  ADD COLUMN IF NOT EXISTS new_pro_tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT
    CONSTRAINT order_requests_department_check CHECK (department IN ('P&S', 'WM-95', 'AVD'));
COMMIT;
