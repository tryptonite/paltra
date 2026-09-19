BEGIN;

ALTER TABLE public.order_requests
  DROP CONSTRAINT order_requests_request_type_check;

ALTER TABLE public.order_requests
  ADD CONSTRAINT order_requests_request_type_check
  CHECK (request_type IN ('order_change', 'special_request', 'hold', 'ship_via', 'address', 'quantity', 'missed_ltl', 'other'));

DROP POLICY IF EXISTS "Creators can delete their order requests" ON public.order_requests;
CREATE POLICY "Creators can delete their order requests"
ON public.order_requests
FOR DELETE TO authenticated
USING (created_by = (SELECT auth.uid()));

COMMIT;
