-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  department TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  company TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create BTX entries table
CREATE TABLE IF NOT EXISTS btx_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_type TEXT NOT NULL,
  control_number TEXT NOT NULL,
  wave_number TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  pallets JSONB NOT NULL DEFAULT '[]',
  cartons JSONB NOT NULL DEFAULT '[]',
  user_role TEXT NOT NULL,
  user_department TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create live loads table
CREATE TABLE IF NOT EXISTS liveloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  carrier TEXT NOT NULL,
  ps_count INTEGER NOT NULL DEFAULT 0,
  avd_count INTEGER NOT NULL DEFAULT 0,
  raceway_pallets INTEGER NOT NULL DEFAULT 0,
  fitting_pallets INTEGER NOT NULL DEFAULT 0,
  cartons_95 INTEGER NOT NULL DEFAULT 0,
  total_pallets INTEGER NOT NULL DEFAULT 0,
  total_cartons INTEGER NOT NULL DEFAULT 0,
  user_name TEXT NOT NULL,
  created_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call-ins table
CREATE TABLE IF NOT EXISTS call_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dock_door TEXT NOT NULL,
  carrier TEXT NOT NULL,
  trailer_number TEXT NOT NULL,
  ready_time TEXT NOT NULL,
  user_role TEXT NOT NULL,
  user_department TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dimensions table
CREATE TABLE IF NOT EXISTS dimensions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ship_via TEXT NOT NULL,
  control_number TEXT NOT NULL,
  wave_number TEXT NOT NULL,
  skids JSONB NOT NULL DEFAULT '[]',
  cartons JSONB NOT NULL DEFAULT '[]',
  user_role TEXT NOT NULL,
  user_department TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create truckloads table
CREATE TABLE IF NOT EXISTS truckloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pickup_date TEXT NOT NULL,
  department TEXT NOT NULL,
  ship_via TEXT NOT NULL,
  control_numbers TEXT[] NOT NULL DEFAULT '{}',
  wave_number TEXT NOT NULL,
  po_numbers TEXT[] NOT NULL DEFAULT '{}',
  company_name TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  destination_state TEXT NOT NULL,
  total_pieces INTEGER NOT NULL DEFAULT 0,
  weight DECIMAL(10,2) NOT NULL DEFAULT 0,
  user_role TEXT NOT NULL,
  user_department TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dock doors table
CREATE TABLE IF NOT EXISTS dock_doors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  door_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  carrier TEXT,
  trailer_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_btx_entries_control_number ON btx_entries(control_number);
CREATE INDEX IF NOT EXISTS idx_btx_entries_created_at ON btx_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_liveloads_created_time ON liveloads(created_time);
CREATE INDEX IF NOT EXISTS idx_call_ins_created_at ON call_ins(created_at);
CREATE INDEX IF NOT EXISTS idx_dimensions_control_number ON dimensions(control_number);
CREATE INDEX IF NOT EXISTS idx_dimensions_created_at ON dimensions(created_at);
CREATE INDEX IF NOT EXISTS idx_truckloads_created_at ON truckloads(created_at);
CREATE INDEX IF NOT EXISTS idx_dock_doors_door_number ON dock_doors(door_number);
CREATE INDEX IF NOT EXISTS idx_dock_doors_status ON dock_doors(status);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Enable real-time for profiles table (for immediate user removal detection)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER TABLE btx_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE liveloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE truckloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE dock_doors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for btx_entries table
CREATE POLICY "Authenticated users can view btx entries" ON btx_entries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert btx entries" ON btx_entries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own btx entries" ON btx_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND (role = 'admin' OR id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own btx entries" ON btx_entries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND (role = 'admin' OR id = auth.uid())
    )
  );

-- Similar policies for other tables (abbreviated for brevity)
-- You can copy the pattern above for live_loads, call_ins, dimensions, truckloads

-- RLS Policies for liveloads table
CREATE POLICY "Authenticated users can view liveloads" ON liveloads
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert liveloads" ON liveloads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own liveloads" ON liveloads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND (role = 'admin' OR id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own liveloads" ON liveloads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND (role = 'admin' OR id = auth.uid())
    )
  );

-- RLS Policies for call_ins table
CREATE POLICY "Authenticated users can view call ins" ON call_ins
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert call ins" ON call_ins
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own call ins" ON call_ins
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND (role = 'admin' OR id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own call ins" ON call_ins
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND (role = 'admin' OR id = auth.uid())
    )
  );

-- RLS Policies for dimensions table
CREATE POLICY "Authenticated users can view dimensions" ON dimensions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert dimensions" ON dimensions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own dimensions" ON dimensions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND (role = 'admin' OR id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own dimensions" ON dimensions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND (role = 'admin' OR id = auth.uid())
    )
  );

-- RLS Policies for truckloads table
CREATE POLICY "Authenticated users can view truckloads" ON truckloads
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert truckloads" ON truckloads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own truckloads" ON truckloads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND (role = 'admin' OR id = auth.uid())
    )
  );

CREATE POLICY "Users can delete their own truckloads" ON truckloads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND (role = 'admin' OR id = auth.uid())
    )
  );

-- RLS Policies for dock_doors table
CREATE POLICY "Authenticated users can view dock doors" ON dock_doors
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update dock doors" ON dock_doors
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_btx_entries_updated_at BEFORE UPDATE ON btx_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: liveloads table doesn't have updated_at column, so no trigger needed

CREATE TRIGGER update_call_ins_updated_at BEFORE UPDATE ON call_ins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dimensions_updated_at BEFORE UPDATE ON dimensions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_truckloads_updated_at BEFORE UPDATE ON truckloads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dock_doors_updated_at BEFORE UPDATE ON dock_doors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
