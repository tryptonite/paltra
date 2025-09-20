import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Log warning if using placeholder values
if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-key') {
  console.warn('⚠️ Supabase environment variables not found. Using placeholder values. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          department: string | null
          role: string | null
          company: string | null
          is_approved: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          department?: string | null
          role?: string | null
          company?: string | null
          is_approved?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          department?: string | null
          role?: string | null
          company?: string | null
          is_approved?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      btx_entries: {
        Row: {
          id: string
          shipment_type: string
          control_number: string
          wave_number: string
          tracking_number: string
          pallets: unknown[]
          cartons: unknown[]
          user_role: string
          user_department: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shipment_type: string
          control_number: string
          wave_number: string
          tracking_number: string
          pallets: unknown[]
          cartons: unknown[]
          user_role: string
          user_department: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shipment_type?: string
          control_number?: string
          wave_number?: string
          tracking_number?: string
          pallets?: unknown[]
          cartons?: unknown[]
          user_role?: string
          user_department?: string
          created_at?: string
          updated_at?: string
        }
      }
      liveloads: {
        Row: {
          id: string
          carrier: string
          ps_count: number
          avd_count: number
          raceway_pallets: number
          fitting_pallets: number
          cartons_95: number
          total_pallets: number
          total_cartons: number
          submitted_by: string
          created_time: string
        }
        Insert: {
          id?: string
          carrier: string
          ps_count: number
          avd_count: number
          raceway_pallets: number
          fitting_pallets: number
          cartons_95: number
          total_pallets: number
          total_cartons: number
          submitted_by: string
          created_time?: string
        }
        Update: {
          id?: string
          carrier?: string
          ps_count?: number
          avd_count?: number
          raceway_pallets?: number
          fitting_pallets?: number
          cartons_95?: number
          total_pallets?: number
          total_cartons?: number
          submitted_by?: string
          created_time?: string
        }
      }
      callins: {
        Row: {
          id: string
          submitted_by: string
          carrier: string
          ready_time: string
          trailer_no: string
          dock: number
          submitted_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          submitted_by: string
          carrier: string
          ready_time: string
          trailer_no: string
          dock: number
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          submitted_by?: string
          carrier?: string
          ready_time?: string
          trailer_no?: string
          dock?: number
          submitted_at?: string
          updated_at?: string
        }
      }
      dimensions: {
        Row: {
          id: string
          ship_via: string
          control_number: string
          wave_number: string
          skids: unknown[]
          cartons: unknown[]
          user_role: string
          user_department: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ship_via: string
          control_number: string
          wave_number: string
          skids: unknown[]
          cartons: unknown[]
          user_role: string
          user_department: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ship_via?: string
          control_number?: string
          wave_number?: string
          skids?: unknown[]
          cartons?: unknown[]
          user_role?: string
          user_department?: string
          created_at?: string
          updated_at?: string
        }
      }
      truckloads: {
        Row: {
          id: string
          pickup_date: string
          department: string
          ship_via: string
          control_numbers: string[]
          wave_number: string
          po_numbers: string[]
          company_name: string
          destination_city: string
          destination_state: string
          total_pieces: number
          weight: number
          user_role: string
          user_department: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pickup_date: string
          department: string
          ship_via: string
          control_numbers: string[]
          wave_number: string
          po_numbers: string[]
          company_name: string
          destination_city: string
          destination_state: string
          total_pieces: number
          weight: number
          user_role: string
          user_department: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pickup_date?: string
          department?: string
          ship_via?: string
          control_numbers?: string[]
          wave_number?: string
          po_numbers?: string[]
          company_name?: string
          destination_city?: string
          destination_state?: string
          total_pieces?: number
          weight?: number
          user_role?: string
          user_department?: string
          created_at?: string
          updated_at?: string
        }
      }
      dock_doors: {
        Row: {
          id: string
          door_number: string
          status: string
          carrier: string | null
          trailer_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          door_number: string
          status: string
          carrier?: string | null
          trailer_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          door_number?: string
          status?: string
          carrier?: string | null
          trailer_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
