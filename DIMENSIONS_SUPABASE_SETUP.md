# Dimensions Supabase Integration

The Dimensions page has been successfully connected to the Supabase database. This document explains the setup and how the integration works.

## Features

✅ **Supabase Integration**: Dimensions data is now stored in the `public.dimensions` table in Supabase
✅ **Fallback Support**: If Supabase is not configured, the app falls back to local storage
✅ **Duplicate Control Number Check**: Uses Supabase database for real-time duplicate validation
✅ **User Authentication**: Integrates with Supabase Auth for user context
✅ **Error Handling**: Graceful fallback to local storage on connection issues

## Database Schema

The dimensions table in Supabase has the following structure:

```sql
CREATE TABLE dimensions (
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
```

## Setup Instructions

### 1. Configure Supabase Environment Variables

Create a `.env.local` file in your project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase dashboard under Settings > API.

### 2. Run the Database Schema

Execute the SQL schema found in `supabase-schema.sql` in your Supabase SQL Editor to create all necessary tables and policies.

### 3. Test the Integration

1. Start the development server: `npm run dev`
2. Navigate to the Dimensions page
3. Try creating a new dimension entry
4. Check the browser console for any Supabase connection messages

## How It Works

### Automatic Fallback System

The integration includes an intelligent fallback system:

1. **Supabase Available**: If environment variables are properly configured, all operations use Supabase
2. **Supabase Unavailable**: If Supabase is not configured or fails, operations fall back to local storage
3. **Error Handling**: Network errors or database issues automatically trigger fallback behavior

### API Compatibility

The Supabase integration maintains complete compatibility with the existing Dimensions page API:

- `Dimension.list()` - Fetch all dimensions with optional ordering and limiting
- `Dimension.filter()` - Search dimensions by criteria
- `Dimension.create()` - Create new dimension entries
- `Dimension.update()` - Update existing entries
- `Dimension.delete()` - Delete entries
- `Dimension.checkDuplicateControlNumber()` - Check for duplicate control numbers

### Data Transformation

The integration automatically handles data format differences between Supabase and the local storage format:

- Maps `created_at` ↔ `created_date`
- Maps `updated_at` ↔ `updated_date`
- Generates `created_by` field from user department information
- Handles JSONB arrays for skids and cartons data

## Development vs Production

### Development Mode (No Supabase)
- Uses local browser storage
- Data persists only in the current browser
- Perfect for development and testing
- Console warnings indicate fallback mode

### Production Mode (With Supabase)
- Uses real Supabase database
- Data persists across devices and sessions
- Supports multiple users with authentication
- Real-time duplicate checking

## Monitoring

Check the browser console for integration status messages:

- `"Supabase not configured, falling back to local dataClient"` - Running in development mode
- `"Error fetching dimensions from Supabase, falling back to local data"` - Connection issues
- No warnings - Successfully using Supabase

## Next Steps

To extend this integration to other entities:

1. Follow the same pattern used in `src/api/entities.ts`
2. Add fallback logic with `isSupabaseConfigured()` checks
3. Implement data transformation for field name differences
4. Test both Supabase and fallback modes

## Troubleshooting

### Common Issues

1. **"User must be authenticated"**: Ensure Supabase Auth is properly configured
2. **Database connection errors**: Check your environment variables and network connection
3. **RLS policy errors**: Verify Row Level Security policies are correctly set up in Supabase
4. **Data format issues**: Check the data transformation logic in the entity methods

### Debug Mode

Enable debug logging by checking the browser console. All database operations log their status and any fallback behavior.
