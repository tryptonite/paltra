import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Dock doors data to seed
const dockDoors = [
  // ED LTL Doors (12-21, 23)
  { door_number: '12', status: 'available' },
  { door_number: '13', status: 'available' },
  { door_number: '14', status: 'available' },
  { door_number: '15', status: 'available' },
  { door_number: '16', status: 'available' },
  { door_number: '17', status: 'available' },
  { door_number: '18', status: 'available' },
  { door_number: '19', status: 'available' },
  { door_number: '20', status: 'available' },
  { door_number: '21', status: 'available' },
  { door_number: '23', status: 'available' },
  
  // Retail Doors (25-32, excluding 26)
  { door_number: '25', status: 'available' },
  { door_number: '27', status: 'available' },
  { door_number: '28', status: 'available' },
  { door_number: '29', status: 'available' },
  { door_number: '30', status: 'available' },
  { door_number: '31', status: 'available' },
  { door_number: '32', status: 'available' },
];

async function seedDockDoors() {
  console.log('Seeding dock doors...');
  
  try {
    // Clear existing dock doors first
    const { error: deleteError } = await supabase
      .from('dock_doors')
      .delete()
      .neq('door_number', 999); // Delete all records (use a number that won't exist)
    
    if (deleteError) {
      console.error('Error clearing existing dock doors:', deleteError);
      return;
    }
    
    console.log('Cleared existing dock doors');
    
    // Insert new dock doors
    const { data, error } = await supabase
      .from('dock_doors')
      .insert(dockDoors)
      .select();
    
    if (error) {
      console.error('Error seeding dock doors:', error);
      return;
    }
    
    console.log(`Successfully seeded ${data.length} dock doors:`);
    data.forEach(door => {
      console.log(`- Door ${door.door_number}: ${door.status}`);
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

seedDockDoors();
