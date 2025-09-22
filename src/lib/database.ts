import { supabase, Tables, TablesInsert, TablesUpdate, Database } from './supabase'

// Generic CRUD operations
export class DatabaseService<T extends keyof Database['public']['Tables']> {
  constructor(private tableName: T) {}

  async create(data: TablesInsert<T>) {
    const { data: result, error } = await supabase
      .from(this.tableName as string)
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return result
  }

  async read(id: string) {
    const { data, error } = await supabase
      .from(this.tableName as string)
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async list(orderBy?: string) {
    let query = supabase.from(this.tableName as string).select('*')
    
    if (orderBy) {
      // Handle different orderBy formats
      if (orderBy.includes(' ')) {
        // Format: "column desc" or "column asc"
        const [column, direction] = orderBy.split(' ')
        query = query.order(column, { ascending: direction !== 'desc' })
      } else {
        // Format: "column" (default to ascending)
        query = query.order(orderBy)
      }
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  // Special method for liveloads with profile join
  async listWithProfiles() {
    if (this.tableName !== 'liveloads') {
      throw new Error('listWithProfiles is only available for liveloads table')
    }
    
    const { data, error } = await supabase
      .from('liveloads')
      .select(`
        id, carrier, ps_count, avd_count, raceway_pallets, fitting_pallets, cartons_95,
        total_pallets, total_cartons, created_time, submitted_by,
        profile:profiles(full_name)
      `)
      .order('created_time', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Special method for callins with profile join
  async listCallInsWithProfiles(orderBy?: string) {
    if (this.tableName !== 'callins') {
      throw new Error('listCallInsWithProfiles is only available for callins table')
    }
    
    let query = supabase
      .from('callins')
      .select(`
        id, carrier, ready_time, trailer_no, dock, submitted_at, submitted_by,
        profile:profiles(full_name)
      `)
    
    if (orderBy) {
      // Handle different orderBy formats
      if (orderBy.includes(' ')) {
        // Format: "column desc" or "column asc"
        const [column, direction] = orderBy.split(' ')
        query = query.order(column, { ascending: direction !== 'desc' })
      } else {
        // Format: "column" (default to ascending)
        query = query.order(orderBy)
      }
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  async update(id: string, updates: TablesUpdate<T>) {
    const { data, error } = await supabase
      .from(this.tableName as string)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async delete(id: string | number) {
    console.log('DatabaseService.delete called with:', {
      tableName: this.tableName,
      id: id,
      idType: typeof id
    });
    
    // For liveloads table, the actual database seems to use integer IDs despite TypeScript types
    // Let's try both string and number formats to be safe
    
    let data, error;
    
    // First try with the original ID (could be string UUID or number)
    console.log('Trying delete with original ID:', id, 'type:', typeof id);
    ({ data, error } = await supabase
      .from(this.tableName as string)
      .delete()
      .eq('id', id)
      .select());

    console.log('Delete operation result (original ID):', { data, error });
    
    // If that didn't work and we have a number-like string, try as number
    if ((!data || data.length === 0) && !error && typeof id === 'string' && !isNaN(Number(id))) {
      const numberId = Number(id);
      console.log('Trying delete with converted number ID:', numberId);
      ({ data, error } = await supabase
        .from(this.tableName as string)
        .delete()
        .eq('id', numberId)
        .select());
      console.log('Delete operation result (number ID):', { data, error });
    }
    
    // If that didn't work and we have a number, try as string
    if ((!data || data.length === 0) && !error && typeof id === 'number') {
      const stringId = id.toString();
      console.log('Trying delete with converted string ID:', stringId);
      ({ data, error } = await supabase
        .from(this.tableName as string)
        .delete()
        .eq('id', stringId)
        .select());
      console.log('Delete operation result (string ID):', { data, error });
    }
    
    if (error) {
      console.error('Delete error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log('Final delete result, affected rows:', data?.length || 0);
    return data;
  }

  async search(filters: Record<string, unknown>) {
    let query = supabase.from(this.tableName as string).select('*')
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value)
      }
    })

    const { data, error } = await query
    if (error) throw error
    return data || []
  }
}

// Specific service classes for each table
export const Profiles = new DatabaseService('profiles')
export const BTXEntries = new DatabaseService('btx_entries')
export const LiveLoads = new DatabaseService('liveloads')
export const CallIns = new DatabaseService('callins')
export const Dimensions = new DatabaseService('dimensions')
export const Truckloads = new DatabaseService('truckloads')
export const DockDoors = new DatabaseService('dock_doors')

// Helper functions for common operations
export const checkDuplicateControlNumber = async (controlNumber: string, table: string, fieldName: string = 'control_number') => {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq(fieldName, controlNumber)
    .limit(1)

  if (error) throw error
  return data && data.length > 0
}

export const getTodaysRecords = async (table: string, dateField: string = 'created_at') => {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .gte(dateField, startOfDay.toISOString())
    .lt(dateField, endOfDay.toISOString())
    .order(dateField, { ascending: false })

  if (error) throw error
  return data || []
}

export const getRecordsByDateRange = async (
  table: string, 
  startDate: string, 
  endDate: string, 
  dateField: string = 'created_at'
) => {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .gte(dateField, startDate)
    .lte(dateField, endDate)
    .order(dateField, { ascending: false })

  if (error) throw error
  return data || []
}

// Real-time subscriptions
export const subscribeToTable = (
  table: string,
  callback: (payload: unknown) => void,
  filter?: string
) => {
  let query = supabase
    .channel(`${table}_changes`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: table,
        ...(filter && { filter })
      }, 
      callback
    )
    .subscribe()

  return () => {
    supabase.removeChannel(query)
  }
}
