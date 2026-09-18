-- Order Requests / Special Requests tracking for Paltra
-- Run this migration in the Supabase SQL editor before using the Order Requests page.

CREATE TABLE IF NOT EXISTS public.order_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL,
  customer TEXT,
  request_type TEXT NOT NULL DEFAULT 'special_request'
    CHECK (request_type IN ('order_change', 'special_request', 'hold', 'ship_via', 'address', 'quantity', 'other')),
  request_details TEXT NOT NULL,
  requested_by TEXT,
  action_needed TEXT,
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'waiting', 'completed')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_by_name TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_requests_status
  ON public.order_requests(status);

CREATE INDEX IF NOT EXISTS idx_order_requests_order_number
  ON public.order_requests(order_number);

CREATE INDEX IF NOT EXISTS idx_order_requests_created_at
  ON public.order_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_requests_active_priority
  ON public.order_requests(priority, status);

CREATE OR REPLACE FUNCTION public.set_order_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_requests_updated_at ON public.order_requests;
CREATE TRIGGER trg_order_requests_updated_at
BEFORE UPDATE ON public.order_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_order_requests_updated_at();

ALTER TABLE public.order_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view order requests" ON public.order_requests;
CREATE POLICY "Authenticated users can view order requests"
ON public.order_requests
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can create order requests" ON public.order_requests;
CREATE POLICY "Authenticated users can create order requests"
ON public.order_requests
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() = created_by
);

DROP POLICY IF EXISTS "Authenticated users can update order requests" ON public.order_requests;
CREATE POLICY "Authenticated users can update order requests"
ON public.order_requests
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can delete order requests" ON public.order_requests;
CREATE POLICY "Admins can delete order requests"
ON public.order_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'order_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_requests;
  END IF;
END
$$;
