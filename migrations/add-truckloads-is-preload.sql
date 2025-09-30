-- Adds an explicit is_preload flag to truckloads
-- Safe to run multiple times

ALTER TABLE IF EXISTS public.truckloads
  ADD COLUMN IF NOT EXISTS is_preload boolean DEFAULT false;

-- Optional: expose flag in v_truckloads if the view exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_truckloads'
  ) THEN
    -- Recreate the view to include the column. Adjust field list to match your schema.
    -- This version assumes the base table has columns used elsewhere in the app
    -- and simply selects them plus is_preload and a user display name.
    CREATE OR REPLACE VIEW public.v_truckloads AS
    SELECT 
      t.id,
      t.pickup_date,
      t.department,
      t.ship_via,
      t.po_numbers,
      t.control_numbers,
      t.wave_no,
      t.company_name,
      t.destination,
      t.pieces,
      t.weight_lbs,
      t.is_completed,
      t.completed_at,
      t.is_preload,
      coalesce(p.full_name, 'Unknown User') as user_display
    FROM public.truckloads t
    LEFT JOIN public.profiles p ON t.submitted_by = p.id;
  END IF;
END $$;

