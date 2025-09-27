import { supabase } from '../lib/supabase';

type Dateish = Date | string | null | undefined;

// basic CSV escaper
function toCsv(rows: any[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map(h => esc(r[h])).join(','));
  return lines.join('\n');
}

// fetch all rows with optional date filtering + pagination
async function fetchAll(
  table: string,
  columns: string,
  start: Dateish,
  end: Dateish,
  pageSize = 1000
) {
  let from = 0;
  let to = pageSize - 1;
  const all: any[] = [];

  while (true) {
    let query = supabase.from(table).select(columns, { head: false });
    if (start) query = query.gte('created_at', new Date(start!).toISOString());
    if (end)   query = query.lte('created_at', new Date(end!).toISOString());

    const { data, error } = await query.range(from, to).order('created_at', { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) break;

    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
    to   += pageSize;
  }

  return all;
}

export async function exportSupabaseToCsv(opts: {
  table: 'v_dimensions_summary' | 'v_dimensions' | 'v_btx_summary' | 'v_btx';
  columns?: string; // defaults provided below
  start?: Dateish;
  end?: Dateish;
  filename?: string;
}) {
  const defaults: Record<string, string> = {
    v_dimensions_summary: 'created_at,user_display,control_no,wave_no,ship_via,skids,cartons',
    v_dimensions:
      'id,created_at,control_no,wave_no,ship_via,skids,cartons,length_in,width_in,height_in,qty,volume_in3,user_display,submitted_by',
    v_btx_summary: 'created_at,user_display,type,control_no,wave_no,pallets,cartons,submission_id',
    v_btx:
      'id,created_at,user_display,type,control_no,wave_no,pallets,cartons,length_in,width_in,height_in,qty,volume_in3,submission_id,submitted_by',
  };

  const cols = opts.columns ?? defaults[opts.table];
  const rows = await fetchAll(opts.table, cols, opts.start, opts.end);
  const csv  = toCsv(rows);

  const startTag = opts.start ? new Date(opts.start!).toISOString().slice(0,10) : 'all';
  const endTag   = opts.end   ? new Date(end!).toISOString().slice(0,10)   : 'all';
  const name     = opts.filename ?? `${opts.table}-${startTag}-to-${endTag}.csv`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = name;          // change to .csx if you truly need that extension
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
