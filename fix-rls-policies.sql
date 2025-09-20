-- Fix RLS policies for liveloads table
-- The current policies reference 'users' table which doesn't exist, should be 'profiles'

-- Drop the existing faulty policies
DROP POLICY IF EXISTS "Users can update their own liveloads" ON liveloads;
DROP POLICY IF EXISTS "Users can delete their own liveloads" ON liveloads;

-- Create corrected policies that reference the profiles table
CREATE POLICY "Users can update their own liveloads" ON liveloads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR submitted_by = auth.uid()::text)
    )
  );

CREATE POLICY "Users can delete their own liveloads" ON liveloads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR submitted_by = auth.uid()::text)
    )
  );

-- Alternative: Allow all authenticated users to delete any liveloads (less restrictive)
-- Uncomment these if you want to allow any authenticated user to delete any entry:

-- DROP POLICY IF EXISTS "Users can delete their own liveloads" ON liveloads;
-- CREATE POLICY "Authenticated users can delete liveloads" ON liveloads
--   FOR DELETE USING (auth.role() = 'authenticated');
