import { supabase } from "@/lib/supabase"

export const getLineCounts = async (limit = 200) => {
  const q = supabase
    .from("line_counts") // READ THE TABLE DIRECTLY
    .select(`
      id,
      count_date,
      time_period,
      preferreds,
      parcels,
      ltl,
      total,
      submitted_at,
      profiles!submitted_by(full_name)
    `)
    .order("submitted_at", { ascending: false })
    .limit(limit)

  const { data, error } = await q
  if (error) {
    console.error("line_counts error:", error) // <-- paste this console output to me if it persists
    throw error
  }
  
  // Map the data to include user_display from the profile join
  const mappedData = (data ?? []).map(record => ({
    ...record,
    user_display: record.profiles?.full_name || 'Unknown User'
  }))
  
  return mappedData
}
