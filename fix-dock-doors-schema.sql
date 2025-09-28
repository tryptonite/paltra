-- Fix dock_doors table schema to match code expectations
-- Add missing columns and ensure proper data migration

-- Add missing columns to dock_doors table
ALTER TABLE dock_doors 
ADD COLUMN IF NOT EXISTS label TEXT,
ADD COLUMN IF NOT EXISTS carrier TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID DEFAULT auth.uid(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update status constraint to match code expectations
ALTER TABLE dock_doors DROP CONSTRAINT IF EXISTS dock_doors_status_check;
ALTER TABLE dock_doors ADD CONSTRAINT dock_doors_status_check 
CHECK (status IN ('available', 'loading', 'out-of-service'));

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_dock_doors_updated_at BEFORE UPDATE ON dock_doors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dock_doors_carrier ON dock_doors(carrier);
CREATE INDEX IF NOT EXISTS idx_dock_doors_status ON dock_doors(status);
CREATE INDEX IF NOT EXISTS idx_dock_doors_created_at ON dock_doors(created_at);
