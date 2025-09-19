# Supabase Setup Guide

This guide will help you set up Supabase for your warehouse management application.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - Name: `paltra-warehouse-portal`
   - Database Password: (choose a strong password)
   - Region: (choose closest to your users)
6. Click "Create new project"

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy the following values:
   - Project URL (`VITE_SUPABASE_URL`)
   - Anon public key (`VITE_SUPABASE_ANON_KEY`)

## 3. Set Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp env.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## 4. Set Up the Database

1. In your Supabase dashboard, go to the SQL Editor
2. Copy the contents of `supabase-schema.sql`
3. Paste and run the SQL script to create all tables and policies

## 5. Configure Authentication

1. In your Supabase dashboard, go to Authentication > Settings
2. Configure the following:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add `http://localhost:3000/**`
   - **Email Settings**: Configure your email provider (optional)

## 6. Update Your App

The Supabase integration is already set up in your app. You just need to:

1. Wrap your app with the AuthProvider in `main.tsx`:

```tsx
import { AuthProvider } from '@/contexts/AuthContext'

ReactDOM.createRoot(rootElement).render(
  <AuthProvider>
    <App />
  </AuthProvider>
)
```

2. Use the authentication context in your components:

```tsx
import { useAuth } from '@/contexts/AuthContext'

function MyComponent() {
  const { user, profile, signIn, signOut, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  
  if (!user) {
    return <LoginForm />
  }
  
  return <div>Welcome, {profile?.full_name || user.email}!</div>
}
```

## 7. Database Tables

The following tables are created:

- **users**: User profiles and authentication data
- **btx_entries**: BTX shipment entries
- **live_loads**: Live load tracking data
- **call_ins**: Dock door call-in entries
- **dimensions**: Package dimension entries
- **truckloads**: Truckload management data
- **dock_doors**: Dock door status and assignments

## 8. Row Level Security (RLS)

All tables have Row Level Security enabled with the following policies:

- Users can view and update their own data
- Admins can view and update all data
- Authenticated users can create new entries
- Users can only delete their own entries (unless admin)

## 9. Real-time Features

The database is configured for real-time updates. You can subscribe to table changes:

```tsx
import { subscribeToTable } from '@/lib/database'

const unsubscribe = subscribeToTable('btx_entries', (payload) => {
  console.log('BTX entry changed:', payload)
})

// Don't forget to unsubscribe
unsubscribe()
```

## 10. Real-time User Management

The app includes real-time monitoring of user profiles. When an administrator removes a user from the database:

1. **Immediate Detection**: The app detects profile deletion in real-time
2. **User Notification**: A toast notification appears: "Your account has been removed by an administrator"  
3. **Automatic Sign-out**: The user is automatically signed out after 2 seconds
4. **Redirect to Login**: User is redirected to the login page

This ensures removed users cannot continue using the application.

## 11. Testing

1. Start your development server: `pnpm dev` (will run on http://localhost:3000)
2. Try creating a new user account
3. Test the authentication flow
4. Verify that data is being saved to Supabase
5. Test user removal by deleting a profile from Supabase dashboard

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**
   - Make sure your `.env.local` file exists and has the correct values
   - Restart your development server after adding environment variables

2. **Authentication not working**
   - Check that your Site URL and Redirect URLs are correctly configured
   - Verify that your Supabase project is active

3. **Database permission errors**
   - Make sure you've run the SQL schema script
   - Check that RLS policies are correctly set up

4. **CORS errors**
   - Add your domain to the allowed origins in Supabase settings

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)
