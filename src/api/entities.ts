import { dataClient } from './dataClient'
import { Dimensions, Profiles, BTXEntries, LiveLoads, CallIns, Truckloads, DockDoors, checkDuplicateControlNumber } from '@/lib/database'
import { supabase } from '@/lib/supabase'

type CachedUser = {
  id: string
  email: string
  role: string
  department: string
  full_name: string
  company: string
  is_approved: boolean
  [key: string]: unknown
}

const USER_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
let cachedUser: CachedUser | null = null
let cachedUserFetchedAt = 0
const USER_AUTH_TIMEOUT_MS = 8000

const setCachedUser = (user: CachedUser | null) => {
  cachedUser = user
  cachedUserFetchedAt = user ? Date.now() : 0
}

const normalizeUserRecord = (user: Partial<CachedUser> & { id: string; email: string }) => ({
  ...user,
  role: user.role || 'user',
  department: user.department || 'unknown',
  full_name: user.full_name || '',
  company: user.company || 'Paltra',
  is_approved: Boolean(user.is_approved),
}) as CachedUser

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  return supabaseUrl && supabaseKey && 
         supabaseUrl !== 'https://placeholder.supabase.co' && 
         supabaseKey !== 'placeholder-key'
}

// Fail-fast wrapper so UI doesn't hang on slow requests
const withTimeout = async <T = any>(promise: PromiseLike<T>, ms = 2500): Promise<T> => {
  return await Promise.race([
    promise as PromiseLike<T>,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)) as Promise<T>,
  ])
}

// Create a Supabase-compatible API for Dimension that matches the existing interface
export const Dimension = {
  async list(orderBy?: string, limit?: number) {
    try {
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
      const resp: any = await withTimeout(
        supabase
          .from('v_dimensions')
          .select('id, created_at, control_no, wave_no, ship_via, skids, cartons, length_in, width_in, height_in, qty, volume_in3, user_display')
          .order('created_at', { ascending: false })
          .limit(limit || 300) as any,
        2500
      )
      const { data: dimensionsData, error } = resp

      if (error) throw error as any
      const data = dimensionsData || []
      
      // Transform the data to match the expected format
      return data.map((record: any) => ({
        ...record,
        control_number: record.control_no, // Map control_no back to control_number
        wave_number: record.wave_no, // Map wave_no back to wave_number
        created_date: record.created_at,
        updated_date: record.created_at, // Use created_at since no updated_at
        created_by: record.user_display || 'Unknown User', // Use actual user display name
        length: record.length_in,
        width: record.width_in,
        height: record.height_in,
        quantity: record.qty,
        user_role: 'user',
        user_department: 'unknown'
      }))
    } catch (error) {
      console.warn('Dimension.list falling back due to error/timeout:', error)
      return await dataClient.entities.Dimension.list(orderBy, limit)
    }
  },

  async filter(criteria: any) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Please check your environment variables.')
    }

    let query = supabase
      .from('v_dimensions')
      .select('id, created_at, control_no, wave_no, length_in, width_in, height_in, qty, user_display');

    // Apply filters
    if (criteria.control_number) {
      query = query.eq('control_no', criteria.control_number)
    }
    if (criteria.wave_number) {
      query = query.eq('wave_no', criteria.wave_number)
    }
    if (criteria.length) {
      query = query.eq('length_in', criteria.length)
    }
    if (criteria.width) {
      query = query.eq('width_in', criteria.width)
    }
    if (criteria.height) {
      query = query.eq('height_in', criteria.height)
    }
    if (criteria.quantity) {
      query = query.eq('qty', criteria.quantity)
    }
    if (criteria.created_date) {
      const sel = new Date(criteria.created_date)
      const start = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate())
      const end = new Date(sel.getFullYear(), sel.getMonth(), sel.getDate() + 1)
      query = query
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())
    }

    const resp: any = await withTimeout(query.order('created_at', { ascending: false }) as any, 2500)
    const { data: dimensionsData, error } = resp
    if (error) throw error
    
    return (dimensionsData || []).map((record: any) => ({
      ...record,
      control_number: record.control_no, // Map control_no back to control_number
      wave_number: record.wave_no, // Map wave_no back to wave_number
      created_date: record.created_at,
      updated_date: record.created_at, // Use created_at since no updated_at
      created_by: record.user_display || 'Unknown User',
      length: record.length_in,
      width: record.width_in,
      height: record.height_in,
      quantity: record.qty,
      user_role: 'user',
      user_department: 'unknown'
    }));
  },

  async create(payload: any) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Please check your environment variables.')
    }
      
    // Get current user from auth context
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User must be authenticated to create dimensions')
    }
      
    // Handle the new structure with ship_via, skids, cartons arrays
    const controlNumber = payload.control_no || payload.control_number
    const shipVia = payload.ship_via
    const waveNumber = payload.wave_number
    const skidsArray = payload.skids || []
    const cartonsArray = payload.cartons || []
      
    // Create records for all skids
    const skidRecords = skidsArray.map(skid => ({
      control_no: controlNumber,
      ship_via: shipVia,
      wave_no: waveNumber,
      length_in: parseFloat(skid.length) || 0,
      width_in: parseFloat(skid.width) || 0,
      height_in: parseFloat(skid.height) || 0,
      qty: 1,
      skids: skidsArray.length, // Total count of skids
      cartons: cartonsArray.length, // Total count of cartons
      submitted_by: user.id
    }))
      
    // Create records for all cartons  
    const cartonRecords = cartonsArray.map(carton => ({
      control_no: controlNumber,
      ship_via: shipVia,
      wave_no: waveNumber,
      length_in: parseFloat(carton.length) || 0,
      width_in: parseFloat(carton.width) || 0,
      height_in: parseFloat(carton.height) || 0,
      qty: 1,
      skids: skidsArray.length, // Total count of skids
      cartons: cartonsArray.length, // Total count of cartons
      submitted_by: user.id
    }))
      
    // Combine all records
    const allRecords = [...skidRecords, ...cartonRecords]
      
    if (allRecords.length === 0) {
      throw new Error('No valid dimensions provided')
    }
      
    // Insert all records
    const { data: result, error } = await supabase
      .from('dimensions')
      .insert(allRecords)
      .select();

    if (error) throw error;
      
    // Return the first record (they all have the same metadata)
    const firstRecord = result[0]
    return {
      id: firstRecord.id,
      control_number: firstRecord.control_no,
      wave_number: firstRecord.wave_no,
      ship_via: firstRecord.ship_via,
      skids: firstRecord.skids,
      cartons: firstRecord.cartons,
      created_date: firstRecord.created_at,
      updated_date: firstRecord.created_at,
      created_by: 'User',
      user_role: payload.user_role || 'user',
      user_department: payload.user_department || 'unknown'
    }
  },

  async update(id: string, updates: any) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Please check your environment variables.')
    }

    // Transform updates to match actual database schema
    const dbUpdates = { ...updates }
    if (updates.control_number) {
      dbUpdates.control_no = updates.control_number
      delete dbUpdates.control_number
    }
    if (updates.wave_number) {
      dbUpdates.wave_no = updates.wave_number
      delete dbUpdates.wave_number
    }
    if (updates.length) {
      dbUpdates.length_in = updates.length
      delete dbUpdates.length
    }
    if (updates.width) {
      dbUpdates.width_in = updates.width
      delete dbUpdates.width
    }
    if (updates.height) {
      dbUpdates.height_in = updates.height
      delete dbUpdates.height
    }
    if (updates.quantity) {
      dbUpdates.qty = updates.quantity
      delete dbUpdates.quantity
    }

    const result = await Dimensions.update(id, dbUpdates)
    return {
      ...result,
      control_number: result.control_no, // Map control_no back to control_number
      wave_number: result.wave_no, // Map wave_no back to wave_number
      created_date: result.created_at,
      updated_date: result.created_at, // Use created_at since no updated_at
      created_by: 'User', // Placeholder for updated record
      length: result.length_in,
      width: result.width_in,
      height: result.height_in,
      quantity: result.qty,
      user_role: 'user',
      user_department: 'unknown'
    }
  },

  async delete(id: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Please check your environment variables.')
    }

    await Dimensions.delete(id)
  },

  // Helper function for duplicate control number check
  async checkDuplicateControlNumber(controlNumber: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Please check your environment variables.')
    }

    // Use control_no field name for the actual table
    return await checkDuplicateControlNumber(controlNumber, 'dimensions', 'control_no')
  },

  // Read raw rows from v_dimensions view
  async readRawRows(controlNo: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Please check your environment variables.')
    }

    const { data, error } = await supabase
      .from('v_dimensions')
      .select('id, created_at, control_no, wave_no, ship_via, skids, cartons, length_in, width_in, height_in, qty, volume_in3, user_display')
      .eq('control_no', controlNo)
      .order('created_at', { ascending: true });

    if (error) throw error
    return data || []
  },

  // Read per-order summary from v_dimensions_summary view
  async readOrderSummary(controlNo: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Please check your environment variables.')
    }

    const { data, error } = await supabase
      .from('v_dimensions_summary')
      .select('*')
      .eq('control_no', controlNo)
      .single();

    if (error) throw error
    return data
  }
}

// Create a User API that matches the existing interface
export const User = {
  async me(options?: { forceRefresh?: boolean } | boolean): Promise<CachedUser> {
    const forceRefresh = typeof options === 'boolean' ? options : options?.forceRefresh ?? false

    const now = Date.now()
    if (!forceRefresh && cachedUser && now - cachedUserFetchedAt < USER_CACHE_TTL_MS) {
      return cachedUser
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Unable to resolve authenticated user.')
    }

    try {
      const { data, error } = await withTimeout(supabase.auth.getUser() as PromiseLike<any>, USER_AUTH_TIMEOUT_MS)
      if (error) throw error

      const supabaseUser = data?.user
      if (!supabaseUser) {
        if (cachedUser) {
          return cachedUser
        }
        throw new Error('No authenticated Supabase user session found')
      }

      let resolvedUser: CachedUser

      try {
        const profile = await withTimeout(Profiles.read(supabaseUser.id) as PromiseLike<any>, USER_AUTH_TIMEOUT_MS)
        resolvedUser = normalizeUserRecord({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          role: profile?.role ?? 'user',
          department: profile?.department ?? 'unknown',
          full_name: profile?.full_name ?? supabaseUser.email ?? '',
          company: profile?.company ?? 'Paltra',
          is_approved: profile?.is_approved ?? false,
        })
      } catch (profileError) {
        console.warn('Falling back to auth metadata for user profile:', profileError)
        resolvedUser = normalizeUserRecord({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          role: 'user',
          department: 'unknown',
          full_name: supabaseUser.email || '',
          company: 'Paltra',
          is_approved: false,
        })
      }

      setCachedUser(resolvedUser)
      return resolvedUser
    } catch (error) {
      console.error('Error getting current user from Supabase:', error)
      setCachedUser(null)
      throw error
    }
  },

  clearCache() {
    setCachedUser(null)
  },
}

// Create a Supabase-compatible API for CallIn that matches the existing interface
export const CallIn = {
  async list(orderBy?: string, limit?: number) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.CallIn.list(orderBy, limit)
      }

      const resp: any = await withTimeout(
        supabase
          .from('v_callins')
          .select('id,submitted_at,carrier,ready_time,trailer_no,dock,user_display')
          .order('submitted_at', { ascending: false })
          .limit(300) as any,
        2500
      )

      const { data: callinsData, error } = resp

      if (error) throw error
      const data = callinsData || []
      
      return data.map(record => ({
        ...record,
        created_date: record.submitted_at,
        updated_date: record.submitted_at, // Use submitted_at since updated_at doesn't exist
        created_by: record.user_display || 'Unknown User',
        user_role: 'user',
        user_department: 'unknown',
        // Add profile object for compatibility with existing UI
        profile: {
          full_name: record.user_display || 'Unknown User'
        }
      }))
    } catch (error) {
      console.warn('CallIn.list falling back due to error/timeout:', error)
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
        .select('id,submitted_at,carrier,ready_time,trailer_no,dock,user_display')

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

      const resp: any = await withTimeout(query.order('submitted_at', { ascending: true }) as any, 2500)
      const { data: callinsData, error } = resp
      if (error) throw error
      
      const data = callinsData || []
      return data.map(record => ({
        ...record,
        created_date: record.submitted_at,
        updated_date: record.submitted_at, // Use submitted_at since updated_at doesn't exist
        created_by: record.user_display || 'Unknown User',
        user_role: 'user',
        user_department: 'unknown',
        profile: {
          full_name: record.user_display || 'Unknown User'
        }
      }))
    } catch (error) {
      console.warn('CallIn.filter falling back due to error/timeout:', error)
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
      if (!user) throw new Error('User not authenticated')

      const dbPayload: any = {
        carrier: payload.carrier,
        ready_time: payload.ready_time,
        trailer_no: payload.trailer_no,
        dock: payload.dock || 0,
        submitted_by: user.id,
      }

      if (payload.submitted_at) {
        dbPayload.submitted_at = payload.submitted_at
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
        updated_date: insertData.submitted_at, // Use submitted_at since updated_at doesn't exist
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
        updated_date: result.data.submitted_at, // Use submitted_at since updated_at doesn't exist
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

      const resp: any = await withTimeout(
        supabase
          .from('v_changeovers')
          .select('id,created_at,department,user_display,original_ship_via,new_ship_via,control_no,wave_no,pallets,cartons,so_no,delivery_no,reason_for_change')
          .order('created_at', { ascending: false })
          .limit(300) as any,
        2500
      )

      const { data, error } = resp

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
        .select('id,created_at,department,user_display,original_ship_via,new_ship_via,control_no,wave_no,pallets,cartons,so_no,delivery_no,reason_for_change')

      if (criteria.department) {
        query = query.eq('department', criteria.department)
      }

      const resp: any = await withTimeout(query.order('created_at', { ascending: false }) as any, 2500)
      const { data, error } = resp
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
        reason_for_change: payload.reason_for_change || null,
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

       const resp: any = await withTimeout(
         supabase
           .from('v_btx_summary')
           .select('*')
           .order('created_at', { ascending: false })
           .limit(300) as any,
         2500
       )

      const { data, error } = resp

      if (error) throw error
       const data_mapped = (data || []).map(record => ({
         ...record,
         created_date: record.created_at,
         updated_date: record.created_at,
         created_by: record.user_display || 'User',
         control_number: record.control_no,
         // Convert integers to arrays for UI compatibility
         pallets: Array.isArray(record.pallets) ? record.pallets : [],
         cartons: Array.isArray(record.cartons) ? record.cartons : []
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
         .from('v_btx_summary')
         .select('*')

      if (criteria.control_number) {
        query = query.eq('control_no', criteria.control_number)
      }

      const resp: any = await withTimeout(query.order('created_at', { ascending: false }) as any, 2500)
      const { data, error } = resp
      if (error) throw error
      
       const data_mapped = (data || []).map(record => ({
         ...record,
         created_date: record.created_at,
         updated_date: record.created_at,
         created_by: record.user_display || 'User',
         control_number: record.control_no,
         // Convert integers to arrays for UI compatibility
         pallets: Array.isArray(record.pallets) ? record.pallets : [],
         cartons: Array.isArray(record.cartons) ? record.cartons : []
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
         pallets: payload.pallets || 0,
         cartons: payload.cartons || 0,
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

      const resp: any = await withTimeout(
        supabase
          .from('v_line_counts')
          .select('id,count_date,time_period,preferreds,parcels,ltl,total,user_display,submitted_at')
          .order('submitted_at', { ascending: false })
          .limit(limit || 200) as any,
        2500
      )

      const { data, error } = resp

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

      const resp: any = await withTimeout(query.order('submitted_at', { ascending: false }) as any, 2500)
      const { data, error } = resp
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

      const resp: any = await withTimeout(
        supabase
          .from('v_truckloads')
          .select('id,pickup_date,department,ship_via,po_numbers,control_numbers,wave_no,company_name,destination,pieces,weight_lbs,is_completed,completed_at,user_display')
          .order('pickup_date', { ascending: true })
          .limit(300) as any,
        2500
      )

      const { data, error } = resp

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

      const resp: any = await withTimeout(query as any, 2500)
      const { data, error } = resp
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

// Create DockDoor entity that reads from dock_doors table
export const DockDoor = {
  // Helper method to map database status to UI status
  mapStatusToUI(dbStatus: string): string {
    const statusMap = {
      'available': 'Available',
      'loading': 'Loading',
      'out_of_service': 'Out-of-service'
    };
    return statusMap[dbStatus as keyof typeof statusMap] || dbStatus;
  },

  // Helper method to map UI status to database status
  mapStatusToDB(uiStatus: string): string {
    const statusMap = {
      'Available': 'available',
      'Loading': 'loading',
      'Out-of-service': 'out_of-service'
    };
    return statusMap[uiStatus as keyof typeof statusMap] || uiStatus;
  },

  async list(orderBy?: string, limit?: number) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.DockDoor.list(orderBy, limit)
      }

      // Use the exact Supabase query pattern provided by the user
      const { data, error } = await supabase
        .from('dock_doors')
        .select('id, door_number, label, status, carrier, trailer, created_at, updated_at')
        .order('door_number', { ascending: true });
      
      if (error) console.error(error);
      if (error) throw error
      
      const dockDoorsData = data || []
      
      return dockDoorsData.map((record: any) => ({
        ...record,
        door_number: record.door_number,
        status: this.mapStatusToUI(record.status),
        carrier: record.carrier, // Use carrier directly for UI compatibility
        trailer: record.trailer, // Use trailer directly for UI compatibility
        created_date: record.created_at,
        updated_date: record.updated_at,
        created_by: 'System', // Placeholder since dock_doors doesn't track user
      }))
    } catch (error) {
      console.warn('DockDoor.list falling back due to error/timeout:', error)
      return await dataClient.entities.DockDoor.list(orderBy, limit)
    }
  },

  async filter(criteria: any) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.DockDoor.filter(criteria)
      }

      let query = supabase
        .from('dock_doors')
        .select('id, door_number, label, status, carrier, trailer, created_at, updated_at') // Correct: using trailer field

      // Apply filters - map UI status to DB status
      if (criteria.status) {
        query = query.eq('status', this.mapStatusToDB(criteria.status))
      }
      if (criteria.door_number) {
        query = query.eq('door_number', criteria.door_number)
      }
      if (criteria.carrier_code) {
        query = query.eq('carrier', criteria.carrier_code) // Map carrier_code to carrier for DB query
      }

      const resp: any = await withTimeout(query.order('door_number', { ascending: true }) as any, 2500)
      const { data: dockDoorsData, error } = resp
      if (error) throw error
      
      return (dockDoorsData || []).map((record: any) => ({
        ...record,
        door_number: record.door_number,
        status: this.mapStatusToUI(record.status),
        carrier: record.carrier, // Use carrier directly for UI compatibility
        trailer: record.trailer, // Use trailer directly for UI compatibility
        created_date: record.updated_at,
        updated_date: record.updated_at,
        created_by: 'System',
        user_role: 'user',
        user_department: 'operations'
      }))
    } catch (error) {
      console.warn('DockDoor.filter falling back due to error/timeout:', error)
      return await dataClient.entities.DockDoor.filter(criteria)
    }
  },

  async create(payload: any) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient');
        return await dataClient.entities.DockDoor.create(payload);
      }

      const dbStatus = this.mapStatusToDB(payload.status || 'Available');
      const dbPayload =
        dbStatus === 'loading'
          ? {
              door_number: payload.door_number,
              label: payload.label ?? null,
              status: dbStatus,
              carrier: payload.carrier ?? payload.carrier_code ?? null,
              trailer: payload.trailer ?? payload.trailer_number ?? null,
            }
          : {
              door_number: payload.door_number,
              label: payload.label ?? null,
              status: dbStatus,
              carrier: null,
              trailer: null,
            };

      const { data, error } = await supabase
        .from('dock_doors')
        .insert(dbPayload)
        .select()
        .single();

      if (error) throw error;
      return { ...data, carrier: data.carrier, trailer: data.trailer };
    } catch (error) {
      console.error('Error creating dock door in Supabase, falling back to local data:', error);
      return await dataClient.entities.DockDoor.create(payload);
    }
  },

  async update(id: string | number, updates: any) {
    try {
      if (!isSupabaseConfigured()) {
        return await dataClient.entities.DockDoor.update(id as any, updates);
      }

      const dbStatus = this.mapStatusToDB(updates.status); // 'available' | 'loading' | 'out_of_service'

      // accept both naming styles (carrier / carrier_code, trailer / trailer_number)
      const norm = (v: any) => {
        if (v === undefined || v === null) return null;
        const s = String(v).trim();
        return s === '' ? null : s;
      };
      const carrierVal = norm(updates.carrier ?? updates.carrier_code);
      const trailerVal = norm(updates.trailer ?? updates.trailer_number);

      const patch =
        dbStatus === 'loading'
          ? { status: dbStatus, carrier: carrierVal, trailer: trailerVal }
          : { status: dbStatus, carrier: null, trailer: null };

      const { data, error } = await supabase
        .from('dock_doors')
        .update(patch)
        .eq('id', Number(id))              // or .eq('door_number', Number(id))
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        status: this.mapStatusToUI(data.status),
        carrier: data.carrier,
        trailer: data.trailer,
         created_date: data.created_at,
        updated_date: data.updated_at,
        created_by: 'System',
        user_role: 'user',
      };
    } catch (err) {
      console.error('DockDoor.update error:', err);
      return await dataClient.entities.DockDoor.update(id as any, updates);
    }
  },

  async delete(id: string) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.DockDoor.delete(id)
      }

      const { error } = await supabase
        .from('dock_doors')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting dock door in Supabase, falling back to local data:', error)
      return await dataClient.entities.DockDoor.delete(id)
    }
  }
}

// Attach the DockDoor entity to window so it can be called from DevTools
// @ts-ignore
if (typeof window !== 'undefined') (window as any).DockDoor = DockDoor;
console.log('[DockDoor] entity loaded');

// LiveLoad entity with Supabase join for user display
export const LiveLoad = {
  async list(orderBy?: string, limit?: number) {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, falling back to local dataClient')
        return await dataClient.entities.LiveLoad.list(orderBy, limit)
      }

      const resp: any = await withTimeout(
        supabase
          .from('liveloads')
          .select('id,carrier,ps_count,avd_count,raceway_pallets,fitting_pallets,cartons_95,total_pallets,total_cartons,created_time,submitted_by,profile:profiles(full_name)')
          .order('created_time', { ascending: false })
          .limit(limit || 300) as any,
        2500
      )
      const { data, error } = resp
      if (error) throw error

      const rows = data || []
      return rows.map((r: any) => ({
        id: r.id,
        carrier: r.carrier,
        ps_count: r.ps_count,
        avd_count: r.avd_count,
        raceway_pallets: r.raceway_pallets,
        fitting_pallets: r.fitting_pallets,
        cartons_95: r.cartons_95,
        total_pallets: r.total_pallets,
        total_cartons: r.total_cartons,
        created_date: r.created_time,
        updated_date: r.created_time,
        created_by: r.profile?.full_name || 'Unknown User',
      }))
    } catch (error) {
      console.warn('LiveLoad.list falling back due to error/timeout:', error)
      return await dataClient.entities.LiveLoad.list(orderBy, limit)
    }
  },
}
