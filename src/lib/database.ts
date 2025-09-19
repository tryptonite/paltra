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
      query = query.order(orderBy)
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

  async delete(id: string) {
    const { error } = await supabase
      .from(this.tableName as string)
      .delete()
      .eq('id', id)

    if (error) throw error
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
export const CallIns = new DatabaseService('call_ins')
export const Dimensions = new DatabaseService('dimensions')
export const Truckloads = new DatabaseService('truckloads')
export const DockDoors = new DatabaseService('dock_doors')

// Helper functions for common operations
export const checkDuplicateControlNumber = async (controlNumber: string, table: string) => {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('control_number', controlNumber)
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
