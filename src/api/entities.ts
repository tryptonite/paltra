import { dataClient } from './dataClient'
import { Dimensions, Profiles, BTXEntries, LiveLoads, CallIns, Truckloads, DockDoors, checkDuplicateControlNumber } from '@/lib/database'
import { supabase } from '@/lib/supabase'

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  return supabaseUrl && supabaseKey && 
         supabaseUrl !== 'https://placeholder.supabase.co' && 
         supabaseKey !== 'placeholder-key'
}

// Create a Supabase-compatible API for Dimension that matches the existing interface
export const Dimension = {
  async list(orderBy?: string, limit?: number) {
    try {
      // Fall back to dataClient if Supabase is not configured
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.Dimension.list(orderBy, limit)
      }

      // Convert the orderBy format from dataClient to Supabase format
      let supabaseOrderBy = orderBy
      if (orderBy?.startsWith('-')) {
        // Convert "-created_date" to "created_at desc"
        const field = orderBy.slice(1)
        const dbField = field === 'created_date' ? 'created_at' : field
        supabaseOrderBy = `${dbField} desc`
      } else if (orderBy) {
        const dbField = orderBy === 'created_date' ? 'created_at' : orderBy
        supabaseOrderBy = dbField
      }
      
      // Use v_dimensions view to get user display names
      const { data: dimensionsData, error } = await supabase
        .from('v_dimensions')
        .select('id, created_at, user_display, control_no, ship_via, skids, cartons')
        .order('created_at', { ascending: false })
        .limit(300)

      if (error) throw error
      const data = dimensionsData || []
      
      // Transform the data to match the expected format
      return data.map(record => ({
        ...record,
        control_number: record.control_no, // Map control_no back to control_number
        created_date: record.created_at,
        updated_date: record.created_at, // Use created_at since no updated_at
        created_by: record.user_display || 'Unknown User', // Use actual user display name
        skids: [{ count: record.skids }], // Convert count back to array format for UI
        cartons: [{ count: record.cartons }], // Convert count back to array format for UI
        wave_number: '', // Not in actual table, provide empty default
        user_role: 'user',
        user_department: 'unknown'
      }))
    } catch (error) {
      console.error('Error fetching dimensions from Supabase, falling back to local data:', error)
      // Fall back to local dataClient on error
      return await dataClient.entities.Dimension.list(orderBy, limit)
    }
  },

  async filter(criteria: any) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.Dimension.filter(criteria)
      }

      // Use v_dimensions view to get user display names
      let query = supabase
        .from('v_dimensions')
        .select('id, created_at, user_display, control_no, ship_via, skids, cartons')

      // Apply filters
      if (criteria.control_number) {
        query = query.eq('control_no', criteria.control_number)
      }
      if (criteria.ship_via) {
        query = query.eq('ship_via', criteria.ship_via)
      }
      
      const { data: dimensionsData, error } = await query
      if (error) throw error
      
      const data = dimensionsData || []
      return data.map(record => ({
        ...record,
        control_number: record.control_no, // Map control_no back to control_number
        created_date: record.created_at,
        updated_date: record.created_at, // Use created_at since no updated_at
        created_by: record.user_display || 'Unknown User', // Use actual user display name
        skids: [{ count: record.skids }], // Convert count back to array format for UI
        cartons: [{ count: record.cartons }], // Convert count back to array format for UI
        wave_number: '', // Not in actual table, provide empty default
        user_role: 'user',
        user_department: 'unknown'
      }))
    } catch (error) {
      console.error('Error filtering dimensions from Supabase, falling back to local data:', error)
      return await dataClient.entities.Dimension.filter(criteria)
    }
  },

  async create(payload: any) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.Dimension.create(payload)
      }

      // Get current user from auth context
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User must be authenticated to create dimensions')
      }

      // Transform payload to match actual database schema
      const dbPayload = {
        ship_via: payload.ship_via,
        control_no: payload.control_number, // Map control_number to control_no
        skids: payload.skids?.length || 0, // Convert array to count
        cartons: payload.cartons?.length || 0, // Convert array to count
        submitted_by: user.id // Use authenticated user ID
      }

      const result = await Dimensions.create(dbPayload)
      
      // Transform result to match expected format
      return {
        ...result,
        control_number: result.control_no, // Map control_no back to control_number
        created_date: result.created_at,
        updated_date: result.created_at, // Use created_at since no updated_at
        created_by: 'User', // Placeholder for newly created record
        skids: [{ count: result.skids }], // Convert count back to array format for UI
        cartons: [{ count: result.cartons }], // Convert count back to array format for UI
        wave_number: '', // Not in actual table, provide empty default
        user_role: 'user',
        user_department: 'unknown'
      }
    } catch (error) {
      console.error('Error creating dimension in Supabase, falling back to local data:', error)
      return await dataClient.entities.Dimension.create(payload)
    }
  },

  async update(id: string, updates: any) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.Dimension.update(id, updates)
      }

      // Transform updates to match actual database schema
      const dbUpdates = { ...updates }
      if (updates.control_number) {
        dbUpdates.control_no = updates.control_number
        delete dbUpdates.control_number
      }
      if (updates.skids) {
        dbUpdates.skids = updates.skids.length || 0
      }
      if (updates.cartons) {
        dbUpdates.cartons = updates.cartons.length || 0
      }

      const result = await Dimensions.update(id, dbUpdates)
      return {
        ...result,
        control_number: result.control_no, // Map control_no back to control_number
        created_date: result.created_at,
        updated_date: result.created_at, // Use created_at since no updated_at
        created_by: 'User', // Placeholder for updated record
        skids: [{ count: result.skids }], // Convert count back to array format for UI
        cartons: [{ count: result.cartons }], // Convert count back to array format for UI
        wave_number: '', // Not in actual table, provide empty default
        user_role: 'user',
        user_department: 'unknown'
      }
    } catch (error) {
      console.error('Error updating dimension in Supabase, falling back to local data:', error)
      return await dataClient.entities.Dimension.update(id, updates)
    }
  },

  async delete(id: string) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.Dimension.delete(id)
      }

      await Dimensions.delete(id)
    } catch (error) {
      console.error('Error deleting dimension in Supabase, falling back to local data:', error)
      return await dataClient.entities.Dimension.delete(id)
    }
  },

  // Helper function for duplicate control number check
  async checkDuplicateControlNumber(controlNumber: string) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient duplicate check')
        const existing = await dataClient.entities.Dimension.filter({ control_number: controlNumber })
        return existing.length > 0
      }

      // Use control_no field name for the actual table
      return await checkDuplicateControlNumber(controlNumber, 'dimensions', 'control_no')
    } catch (error) {
      console.error('Error checking duplicate control number in Supabase, falling back to local check:', error)
      try {
        const existing = await dataClient.entities.Dimension.filter({ control_number: controlNumber })
        return existing.length > 0
      } catch (fallbackError) {
        console.error('Error in fallback duplicate check:', fallbackError)
        return false // If all else fails, allow the operation
      }
    }
  }
}

// Create a User API that matches the existing interface
export const User = {
  async me() {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.auth.me()
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Fall back to local auth if no Supabase user
        return await dataClient.auth.me()
      }

      // Try to get profile from database
      try {
        const profile = await Profiles.read(user.id)
        return {
          id: user.id,
          email: user.email || '',
          role: profile.role || 'user',
          department: profile.department || 'unknown',
          full_name: profile.full_name || '',
          company: profile.company || 'Paltra',
          is_approved: profile.is_approved || false
        }
      } catch (profileError) {
        // If profile doesn't exist, return basic user info
        return {
          id: user.id,
          email: user.email || '',
          role: 'user',
          department: 'unknown',
          full_name: '',
          company: 'Paltra',
          is_approved: false
        }
      }
    } catch (error) {
      console.error('Error getting current user from Supabase, falling back to local data:', error)
      return await dataClient.auth.me()
    }
  }
}

// Create a Supabase-compatible API for CallIn that matches the existing interface
export const CallIn = {
  async list(orderBy?: string, limit?: number) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.CallIn.list(orderBy, limit)
      }

      const { data: callinsData, error } = await supabase
        .from('v_callins')
        .select('id,created_at,user_display,carrier,ready_time,trailer_no,dock,submitted_at')
        .order('created_at', { ascending: false })
        .limit(300)

      if (error) throw error
      const data = callinsData || []
      
      return data.map(record => ({
        ...record,
        created_date: record.created_at,
        updated_date: record.submitted_at,
        created_by: record.user_display || 'Unknown User',
        user_role: 'user',
        user_department: 'unknown',
        // Add profile object for compatibility with existing UI
        profile: {
          full_name: record.user_display || 'Unknown User'
        }
      }))
    } catch (error) {
      console.error('Error fetching call-ins from Supabase, falling back to local data:', error)
      return await dataClient.entities.CallIn.list(orderBy, limit)
    }
  },

  async filter(criteria: any) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.CallIn.filter(criteria)
      }

      let query = supabase
        .from('v_callins')
        .select('id,submitted_at,user_display,carrier,ready_time,trailer_no,dock')

      if (criteria.carrier) {
        query = query.eq('carrier', criteria.carrier)
      }
      
      // Handle date range filtering
      if (criteria.selectedDate) {
        const sel = new Date(criteria.selectedDate)
        const start = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate())
        const end = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate() + 1)
        
        query = query
          .gte('submitted_at', start.toISOString())
          .lt('submitted_at', end.toISOString())
      }
      
      const { data: callinsData, error } = await query.order('submitted_at', { ascending: true })
      if (error) throw error
      
      const data = callinsData || []
      return data.map(record => ({
        ...record,
        created_date: record.submitted_at,
        updated_date: record.submitted_at,
        created_by: record.user_display || 'Unknown User',
        user_role: 'user',
        user_department: 'unknown',
        profile: {
          full_name: record.user_display || 'Unknown User'
        }
      }))
    } catch (error) {
      console.error('Error filtering call-ins from Supabase, falling back to local data:', error)
      return await dataClient.entities.CallIn.filter(criteria)
    }
  },

  async create(payload: any) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.CallIn.create(payload)
      }

      const { data: { user } } = await supabase.auth.getUser()
      const dbPayload = {
        carrier: payload.carrier,
        ready_time: payload.ready_time,
        trailer_no: payload.trailer_no,
        dock: payload.dock || null,
        submitted_by: user?.id,
      }

      const { data: insertData, error: insErr } = await supabase
        .from('callins')
        .insert(dbPayload)
        .select()
        .single()

      if (insErr) throw insErr

      return {
        ...insertData,
        created_date: insertData.submitted_at,
        updated_date: insertData.updated_at,
        created_by: 'User',
        user_role: 'user',
        user_department: 'unknown',
        profile: {
          full_name: 'User'
        }
      }
    } catch (error) {
      console.error('Error creating call-in in Supabase, falling back to local data:', error)
      return await dataClient.entities.CallIn.create(payload)
    }
  },

  async update(id: string, updates: any) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.CallIn.update(id, updates)
      }

      const dbUpdates = { ...updates }
      
      // Remove UI-only fields
      delete dbUpdates.created_date
      delete dbUpdates.updated_date
      delete dbUpdates.created_by
      delete dbUpdates.user_role
      delete dbUpdates.user_department
      delete dbUpdates.profile

      const result = await supabase
        .from('callins')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()

      if (result.error) throw result.error

      return {
        ...result.data,
        created_date: result.data.submitted_at,
        updated_date: result.data.updated_at,
        created_by: 'User',
        user_role: 'user',
        user_department: 'unknown',
        profile: {
          full_name: 'User'
        }
      }
    } catch (error) {
      console.error('Error updating call-in in Supabase, falling back to local data:', error)
      return await dataClient.entities.CallIn.update(id, updates)
    }
  },

  async delete(id: string) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.CallIn.delete(id)
      }

      const { error } = await supabase
        .from('callins')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting call-in in Supabase, falling back to local data:', error)
      return await dataClient.entities.CallIn.delete(id)
    }
  },

  // Special method for compatibility with existing Call-Ins page
  async listCallInsWithProfiles(orderBy?: string) {
    return await this.list(orderBy, 300)
  }
}

// Keep the other entities using the local dataClient for now
export const LiveLoad = dataClient.entities.LiveLoad
export const BTX = dataClient.entities.BTX
export const Truckload = dataClient.entities.Truckload
export const Changeover = dataClient.entities.Changeover
export const LineCount = dataClient.entities.LineCount
export const DockDoor = dataClient.entities.DockDoor
