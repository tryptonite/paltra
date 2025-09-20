-- Debug script to check callins table status

-- Check if callins table exists
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name IN ('callins', 'call_ins') 
AND table_schema = 'public';

-- Check table structure if it exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name IN ('callins', 'call_ins') 
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('callins', 'call_ins');

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity, forcerowsecurity
FROM pg_tables 
WHERE tablename IN ('callins', 'call_ins') 
AND schemaname = 'public';

-- Try to select from the table (this will show if there are permission issues)
-- Uncomment the line that matches your actual table name:
-- SELECT COUNT(*) FROM public.callins;
-- SELECT COUNT(*) FROM public.call_ins;
