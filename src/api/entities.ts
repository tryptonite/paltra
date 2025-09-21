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

// Create Changeover entity that reads from v_changeovers view
export const Changeover = {
  async list(orderBy?: string, limit?: number) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.Changeover.list(orderBy, limit)
      }

      const { data, error } = await supabase
        .from('v_changeovers')
        .select('id,created_at,department,user_display,original_ship_via,new_ship_via,control_no,wave_no,pallets,cartons,so_no,delivery_no')
        .order('created_at', { ascending: false })
        .limit(300)

      if (error) throw error
      const data_mapped = (data || []).map(record => ({
        ...record,
        created_date: record.created_at,
        updated_date: record.created_at,
        created_by: record.user_display || 'Unknown User',
        control_number: record.control_no,
        wave_number: record.wave_no,
        so_number: record.so_no,
        delivery_number: record.delivery_no
      }))
      return data_mapped
    } catch (error) {
      console.error('Error fetching changeovers from Supabase, falling back to local data:', error)
      return await dataClient.entities.Changeover.list(orderBy, limit)
    }
  },

  async filter(criteria: any) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.Changeover.filter(criteria)
      }

      let query = supabase
        .from('v_changeovers')
        .select('id,created_at,department,user_display,original_ship_via,new_ship_via,control_no,wave_no,pallets,cartons,so_no,delivery_no')

      if (criteria.department) {
        query = query.eq('department', criteria.department)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      
      const data_mapped = (data || []).map(record => ({
        ...record,
        created_date: record.created_at,
        updated_date: record.created_at,
        created_by: record.user_display || 'Unknown User',
        control_number: record.control_no,
        wave_number: record.wave_no,
        so_number: record.so_no,
        delivery_number: record.delivery_no
      }))
      return data_mapped
    } catch (error) {
      console.error('Error filtering changeovers from Supabase, falling back to local data:', error)
      return await dataClient.entities.Changeover.filter(criteria)
    }
  },

  async create(payload: any) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.Changeover.create(payload)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const dbPayload = {
        department: payload.department,
        original_ship_via: payload.original_ship_via,
        new_ship_via: payload.new_ship_via,
        control_no: payload.control_no || payload.control_number,
        wave_no: payload.wave_no || payload.wave_number,
        pallets: payload.pallets,
        cartons: payload.cartons,
        so_no: payload.so_no || payload.so_number,
        delivery_no: payload.delivery_no || payload.delivery_number,
        submitted_by: user.id
      }

      const { data, error } = await supabase
        .from('changeovers')
        .insert(dbPayload)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating changeover in Supabase, falling back to local data:', error)
      return await dataClient.entities.Changeover.create(payload)
    }
  },

  async update(id: string, payload: any) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.Changeover.update(id, payload)
      }

      const { error } = await supabase
        .from('changeovers')
        .update(payload)
        .eq('id', id)

      if (error) throw error
      return { id, ...payload }
    } catch (error) {
      console.error('Error updating changeover in Supabase, falling back to local data:', error)
      return await dataClient.entities.Changeover.update(id, payload)
    }
  },

  async delete(id: string) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.Changeover.delete(id)
      }

      const { error } = await supabase
        .from('changeovers')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting changeover from Supabase, falling back to local data:', error)
      return await dataClient.entities.Changeover.delete(id)
    }
  }
}

// Create BTX entity that reads from v_btx view
export const BTX = {
  async list(orderBy?: string, limit?: number) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.BTX.list(orderBy, limit)
      }

      const { data, error } = await supabase
        .from('v_btx')
        .select('id,created_at,user_display,type,control_no,wave_no,tracking_no,pallets,cartons')
        .order('created_at', { ascending: false })
        .limit(300)

      if (error) throw error
      const data_mapped = (data || []).map(record => ({
        ...record,
        created_date: record.created_at,
        updated_date: record.created_at,
        created_by: record.user_display || 'Unknown User',
        shipment_type: record.type,
        control_number: record.control_no,
        wave_number: record.wave_no,
        tracking_number: record.tracking_no,
        // Convert counts back to arrays for UI compatibility
        pallets: Array(record.pallets || 0).fill({ length: '', width: '', height: '' }),
        cartons: Array(record.cartons || 0).fill({ length: '', width: '', height: '' })
      }))
      return data_mapped
    } catch (error) {
      console.error('Error fetching BTX from Supabase, falling back to local data:', error)
      return await dataClient.entities.BTX.list(orderBy, limit)
    }
  },

  async filter(criteria: any) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.BTX.filter(criteria)
      }

      let query = supabase
        .from('v_btx')
        .select('id,created_at,user_display,type,control_no,wave_no,tracking_no,pallets,cartons')

      if (criteria.control_number) {
        query = query.eq('control_no', criteria.control_number)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      
      const data_mapped = (data || []).map(record => ({
        ...record,
        created_date: record.created_at,
        updated_date: record.created_at,
        created_by: record.user_display || 'Unknown User',
        shipment_type: record.type,
        control_number: record.control_no,
        wave_number: record.wave_no,
        tracking_number: record.tracking_no,
        pallets: Array(record.pallets || 0).fill({ length: '', width: '', height: '' }),
        cartons: Array(record.cartons || 0).fill({ length: '', width: '', height: '' })
      }))
      return data_mapped
    } catch (error) {
      console.error('Error filtering BTX from Supabase, falling back to local data:', error)
      return await dataClient.entities.BTX.filter(criteria)
    }
  },

  async create(payload: any) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.BTX.create(payload)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const dbPayload = {
        type: payload.shipment_type,
        control_no: payload.control_number,
        wave_no: payload.wave_number,
        tracking_no: payload.tracking_number,
        pallets: payload.pallets ? payload.pallets.length : 0,
        cartons: payload.cartons ? payload.cartons.length : 0,
        submitted_by: user.id
      }

      const { data, error } = await supabase
        .from('btx')
        .insert(dbPayload)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating BTX in Supabase, falling back to local data:', error)
      return await dataClient.entities.BTX.create(payload)
    }
  },

  async update(id: string, payload: any) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.BTX.update(id, payload)
      }

      const { error } = await supabase
        .from('btx')
        .update(payload)
        .eq('id', id)

      if (error) throw error
      return { id, ...payload }
    } catch (error) {
      console.error('Error updating BTX in Supabase, falling back to local data:', error)
      return await dataClient.entities.BTX.update(id, payload)
    }
  },

  async delete(id: string) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.BTX.delete(id)
      }

      const { error } = await supabase
        .from('btx')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting BTX from Supabase, falling back to local data:', error)
      return await dataClient.entities.BTX.delete(id)
    }
  },

  async checkDuplicateControlNumber(controlNumber: string) {
    try {
      if (!isSupabaseConfigured()) {
        const existing = await dataClient.entities.BTX.filter({ control_number: controlNumber })
        return existing.length > 0
      }

      const { data, error } = await supabase
        .from('btx')
        .select('id')
        .eq('control_no', controlNumber)
        .limit(1)

      if (error) throw error
      return data && data.length > 0
    } catch (error) {
      console.error('Error checking duplicate control number in BTX:', error)
      return false
    }
  }
}

// Create LineCount entity that reads from v_line_counts view
export const LineCount = {
  async list(orderBy?: string, limit?: number) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.LineCount.list(orderBy, limit)
      }

      const { data, error } = await supabase
        .from('v_line_counts')
        .select('id,count_date,time_period,preferreds,parcels,ltl,total,user_display,submitted_at')
        .order('submitted_at', { ascending: false })
        .limit(limit || 200)

      if (error) throw error
      const data_mapped = (data || []).map(record => ({
        ...record,
        date: record.count_date,
        created_date: record.submitted_at,
        updated_date: record.submitted_at,
        created_by: record.user_display || 'Unknown User'
      }))
      return data_mapped
    } catch (error) {
      console.error('Error fetching line counts from Supabase, falling back to local data:', error)
      return await dataClient.entities.LineCount.list(orderBy, limit)
    }
  },

  async filter(criteria: any) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.LineCount.filter(criteria)
      }

      let query = supabase
        .from('v_line_counts')
        .select('id,count_date,time_period,preferreds,parcels,ltl,total,user_display,submitted_at')

      if (criteria.date) {
        query = query.eq('count_date', criteria.date)
      }

      const { data, error } = await query.order('submitted_at', { ascending: false })
      if (error) throw error
      
      const data_mapped = (data || []).map(record => ({
        ...record,
        date: record.count_date,
        created_date: record.submitted_at,
        updated_date: record.submitted_at,
        created_by: record.user_display || 'Unknown User'
      }))
      return data_mapped
    } catch (error) {
      console.error('Error filtering line counts from Supabase, falling back to local data:', error)
      return await dataClient.entities.LineCount.filter(criteria)
    }
  },

  async create(payload: any) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.LineCount.create(payload)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      // Do NOT include total field - it will be handled by database constraint
      const dbPayload = {
        count_date: payload.date,
        time_period: payload.time_period,
        preferreds: payload.preferreds,
        parcels: payload.parcels,
        ltl: payload.ltl,
        total: payload.total,
        submitted_by: user.id
      }

      const { data, error } = await supabase
        .from('line_counts')
        .insert(dbPayload)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating line count in Supabase, falling back to local data:', error)
      return await dataClient.entities.LineCount.create(payload)
    }
  },

  async update(id: string, payload: any) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.LineCount.update(id, payload)
      }

      const { error } = await supabase
        .from('line_counts')
        .update(payload)
        .eq('id', id)

      if (error) throw error
      return { id, ...payload }
    } catch (error) {
      console.error('Error updating line count in Supabase, falling back to local data:', error)
      return await dataClient.entities.LineCount.update(id, payload)
    }
  },

  async delete(id: string) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.LineCount.delete(id)
      }

      const { error } = await supabase
        .from('line_counts')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting line count from Supabase, falling back to local data:', error)
      return await dataClient.entities.LineCount.delete(id)
    }
  }
}

// Create Truckload entity that reads from v_truckloads view
export const Truckload = {
  async list(orderBy?: string, limit?: number) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.Truckload.list(orderBy, limit)
      }

      const { data, error } = await supabase
        .from('v_truckloads')
        .select('id,pickup_date,department,ship_via,po_numbers,control_numbers,wave_no,company_name,destination,pieces,weight_lbs,is_completed,completed_at,user_display')
        .order('pickup_date', { ascending: true })
        .limit(300)

      if (error) throw error
      const data_mapped = (data || []).map(record => ({
        ...record,
        created_date: record.pickup_date,
        updated_date: record.completed_at || record.pickup_date,
        created_by: record.user_display || 'Unknown User',
        wave_number: record.wave_no,
        total_pieces: record.pieces,
        weight: record.weight_lbs,
        destination_city: record.destination?.split(', ')[0] || record.destination,
        destination_state: record.destination?.split(', ')[1] || '',
        completed: record.is_completed
      }))
      return data_mapped
    } catch (error) {
      console.error('Error fetching truckloads from Supabase, falling back to local data:', error)
      return await dataClient.entities.Truckload.list(orderBy, limit)
    }
  },

  async filter(criteria: any) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.Truckload.filter(criteria)
      }

      let query = supabase
        .from('v_truckloads')
        .select('id,pickup_date,department,ship_via,po_numbers,control_numbers,wave_no,company_name,destination,pieces,weight_lbs,is_completed,completed_at,user_display')

      if (criteria.completed !== undefined) {
        query = query.eq('is_completed', criteria.completed)
      }

      if (criteria.completed === false) {
        // Active truckloads - order by pickup_date
        query = query.order('pickup_date', { ascending: true })
      } else if (criteria.completed === true) {
        // Completed truckloads - order by completed_at
        query = query.order('completed_at', { ascending: false })
        
        // Only show last 7 days of completed
        const oneWeekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString()
        query = query.gte('completed_at', oneWeekAgo)
      }

      const { data, error } = await query
      if (error) throw error
      
      const data_mapped = (data || []).map(record => ({
        ...record,
        created_date: record.pickup_date,
        updated_date: record.completed_at || record.pickup_date,
        created_by: record.user_display || 'Unknown User',
        wave_number: record.wave_no,
        total_pieces: record.pieces,
        weight: record.weight_lbs,
        destination_city: record.destination?.split(', ')[0] || record.destination,
        destination_state: record.destination?.split(', ')[1] || '',
        completed: record.is_completed
      }))
      return data_mapped
    } catch (error) {
      console.error('Error filtering truckloads from Supabase, falling back to local data:', error)
      return await dataClient.entities.Truckload.filter(criteria)
    }
  },

  async create(payload: any) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.Truckload.create(payload)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const dbPayload = {
        pickup_date: payload.pickup_date,
        department: payload.department,
        ship_via: payload.ship_via,
        po_numbers: payload.po_numbers,
        control_numbers: payload.control_numbers,
        wave_no: payload.wave_number,
        company_name: payload.company_name,
        destination: `${payload.destination_city}, ${payload.destination_state}`,
        pieces: payload.total_pieces,
        weight_lbs: payload.weight,
        is_completed: false,
        submitted_by: user.id
      }

      const { data, error } = await supabase
        .from('truckloads')
        .insert(dbPayload)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating truckload in Supabase, falling back to local data:', error)
      return await dataClient.entities.Truckload.create(payload)
    }
  },

  async update(id: string, payload: any) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.Truckload.update(id, payload)
      }

      const dbPayload = { ...payload }
      
      // Map UI fields to database fields if needed
      if (payload.destination_city && payload.destination_state) {
        dbPayload.destination = `${payload.destination_city}, ${payload.destination_state}`
        delete dbPayload.destination_city
        delete dbPayload.destination_state
      }
      if (payload.total_pieces) {
        dbPayload.pieces = payload.total_pieces
        delete dbPayload.total_pieces
      }
      if (payload.weight) {
        dbPayload.weight_lbs = payload.weight
        delete dbPayload.weight
      }
      if (payload.wave_number) {
        dbPayload.wave_no = payload.wave_number
        delete dbPayload.wave_number
      }
      if (payload.completed !== undefined) {
        dbPayload.is_completed = payload.completed
        if (payload.completed) {
          dbPayload.completed_at = new Date().toISOString()
        }
        delete dbPayload.completed
      }

      const { error } = await supabase
        .from('truckloads')
        .update(dbPayload)
        .eq('id', id)

      if (error) throw error
      return { id, ...payload }
    } catch (error) {
      console.error('Error updating truckload in Supabase, falling back to local data:', error)
      return await dataClient.entities.Truckload.update(id, payload)
    }
  },

  async delete(id: string) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.Truckload.delete(id)
      }

      const { error } = await supabase
        .from('truckloads')
        .delete()
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting truckload from Supabase, falling back to local data:', error)
      return await dataClient.entities.Truckload.delete(id)
    }
  }
}

// Keep the other entities using the local dataClient for now
export const LiveLoad = dataClient.entities.LiveLoad
export const DockDoor = dataClient.entities.DockDoor
