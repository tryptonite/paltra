import { supabase } from '@/lib/supabase';

const num = (v: unknown) => {
  const n = typeof v === 'string' ? parseFloat(v.trim()) : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Create one BTX submission with N lines. Writes to base table `btx`. */
export async function createBtxSubmission(
  header: {
    type?: string | null;
    control_no?: string | null;
    wave_no?: string | null;
  },
  lines: Array<{
    pallets?: number | string;
    cartons?: number | string;
    length_in?: number | string;
    width_in?: number | string;
    height_in?: number | string;
    qty?: number | string;
  }>
) {
  const submission_id = crypto.randomUUID(); // same id for all lines

  const rows = lines.map(l => ({
    submission_id,
    type: header.type ?? null,
    control_no: header.control_no ?? null,
    wave_no: header.wave_no ?? null,
    pallets: Number(l.pallets) || 0,
    cartons: Number(l.cartons) || 0,
    length_in: num(l.length_in),
    width_in:  num(l.width_in),
    height_in: num(l.height_in),
    qty: Number(l.qty) || 1,
  }));

  const { error } = await supabase.from('btx').insert(rows);
  if (error) throw error;
  return { submission_id };
}

/** Recent Entries list – one row per submission */
export async function listBtxRecent(limit = 50) {
  const { data, error } = await supabase
    .from('v_btx_summary')
    .select('created_at, user_display, type, control_no, wave_no, pallets, cartons, submission_id')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/** Drill-in detail for a submission (all lines) */
export async function getBtxSubmission(submission_id: string) {
  const { data, error } = await supabase
    .from('v_btx')
    .select('id, created_at, user_display, type, control_no, wave_no, pallets, cartons, length_in, width_in, height_in, qty, volume_in3, submission_id')
    .eq('submission_id', submission_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
