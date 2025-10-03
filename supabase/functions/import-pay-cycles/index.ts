import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayCycleRow {
  company_code: string;
  week_number: number;
  in_date: string;
  out_date: string;
  pay_date: string;
  period_start: string;
  period_end: string;
  deduction_groups?: string;
  special_effects?: string;
  report_groups?: string;
  status: string;
}

// Convert Excel serial number to YYYY-MM-DD
function excelSerialToDate(serial: number): string {
  const epoch = new Date(1899, 11, 30);
  const date = new Date(epoch.getTime() + serial * 86400000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Convert any date format to YYYY-MM-DD
function normalizeDate(value: any): string | null {
  if (!value) return null;
  
  // If it's already a YYYY-MM-DD string
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  
  // If it's an Excel serial number
  if (typeof value === 'number') {
    return excelSerialToDate(value);
  }
  
  // If it's a date string in other format
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  
  return null;
}

// Normalize header names (case-insensitive, handle variations)
function normalizeHeaders(row: any): any {
  const normalized: any = {};
  for (const [key, value] of Object.entries(row)) {
    const lowerKey = key.toLowerCase().trim();
    if (lowerKey === 'company_code' || lowerKey === 'companycode') {
      normalized.company_code = value;
    } else if (lowerKey === 'wk#' || lowerKey === 'week_number' || lowerKey === 'weeknumber') {
      normalized.week_number = value;
    } else if (lowerKey === 'in_date' || lowerKey === 'indate') {
      normalized.in_date = value;
    } else if (lowerKey === 'out_date' || lowerKey === 'outdate') {
      normalized.out_date = value;
    } else if (lowerKey === 'pay_date' || lowerKey === 'paydate') {
      normalized.pay_date = value;
    } else if (lowerKey === 'period_start' || lowerKey === 'periodstart') {
      normalized.period_start = value;
    } else if (lowerKey === 'period_end' || lowerKey === 'periodend') {
      normalized.period_end = value;
    } else if (lowerKey === 'deduction_groups' || lowerKey === 'deductiongroups') {
      normalized.deduction_groups = value;
    } else if (lowerKey === 'special_effects' || lowerKey === 'specialeffects') {
      normalized.special_effects = value;
    } else if (lowerKey === 'report_groups' || lowerKey === 'reportgroups') {
      normalized.report_groups = value;
    }
  }
  return normalized;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { rows } = await req.json();

    if (!Array.isArray(rows)) {
      return new Response(
        JSON.stringify({ error: 'Expected array of rows in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data rows found in file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${rows.length} rows from upload`);

    const validCompanies = ['OZC', '72R', '72S', 'ALL'];
    const expandedRows: PayCycleRow[] = [];
    const warnings: string[] = [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // +2 because row 1 is header, and we're 0-indexed
      const rawRow = rows[i];
      const row = normalizeHeaders(rawRow);

      // Skip completely empty rows
      if (!row.company_code && !row.week_number && !row.period_end) {
        skipped++;
        continue;
      }

      // Validate company_code
      const companyCode = (row.company_code || '').toString().trim().toUpperCase();
      if (!validCompanies.includes(companyCode)) {
        warnings.push(`Row ${rowNum}: Invalid company_code "${companyCode}". Must be OZC, 72R, 72S, or ALL`);
        skipped++;
        continue;
      }

      // Validate week_number
      const weekNumber = parseInt(row.week_number);
      if (!weekNumber || isNaN(weekNumber)) {
        warnings.push(`Row ${rowNum}: Invalid or missing week_number`);
        skipped++;
        continue;
      }

      // Validate and normalize dates
      const inDate = normalizeDate(row.in_date);
      const outDate = normalizeDate(row.out_date);
      const payDate = normalizeDate(row.pay_date);
      const periodEnd = normalizeDate(row.period_end);

      if (!inDate) {
        warnings.push(`Row ${rowNum}: Invalid or missing in_date`);
        skipped++;
        continue;
      }
      if (!outDate) {
        warnings.push(`Row ${rowNum}: Invalid or missing out_date`);
        skipped++;
        continue;
      }
      if (!payDate) {
        warnings.push(`Row ${rowNum}: Invalid or missing pay_date`);
        skipped++;
        continue;
      }
      if (!periodEnd) {
        warnings.push(`Row ${rowNum}: Invalid or missing period_end`);
        skipped++;
        continue;
      }

      // Calculate period_start if missing (bi-weekly: 13 days before period_end)
      let periodStart = normalizeDate(row.period_start);
      if (!periodStart) {
        const endDate = new Date(periodEnd);
        endDate.setDate(endDate.getDate() - 13);
        periodStart = endDate.toISOString().split('T')[0];
      }

      // Build base row
      const baseRow: Omit<PayCycleRow, 'company_code'> = {
        week_number: weekNumber,
        in_date: inDate,
        out_date: outDate,
        pay_date: payDate,
        period_start: periodStart,
        period_end: periodEnd,
        deduction_groups: row.deduction_groups?.toString() || null,
        special_effects: row.special_effects?.toString() || null,
        report_groups: row.report_groups?.toString() || null,
        status: 'scheduled'
      };

      // Expand "ALL" to all companies
      if (companyCode === 'ALL') {
        for (const company of ['OZC', '72R', '72S']) {
          expandedRows.push({ ...baseRow, company_code: company });
        }
      } else {
        expandedRows.push({ ...baseRow, company_code: companyCode });
      }
    }

    if (expandedRows.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No valid rows to import',
          warnings 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Expanded to ${expandedRows.length} pay cycle records`);

    // Check for overlapping periods per company
    for (const newRow of expandedRows) {
      const { data: existing } = await supabase
        .from('pay_cycles')
        .select('id, period_start, period_end, week_number')
        .eq('company_code', newRow.company_code)
        .neq('week_number', newRow.week_number)
        .or(`period_start.lte.${newRow.period_end},period_end.gte.${newRow.period_start}`);

      if (existing && existing.length > 0) {
        warnings.push(
          `Company ${newRow.company_code} Week ${newRow.week_number}: Overlaps with existing week ${existing[0].week_number}`
        );
      }
    }

    // Upsert rows (by company_code + week_number + period_end)
    const { data: upserted, error: upsertError } = await supabase
      .from('pay_cycles')
      .upsert(expandedRows, {
        onConflict: 'company_code,week_number,period_end',
        ignoreDuplicates: false
      })
      .select();

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(
        JSON.stringify({ 
          error: `Database error: ${upsertError.message}`,
          warnings 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    inserted = upserted?.length || 0;

    // Count by company
    const counts: Record<string, number> = {};
    for (const row of expandedRows) {
      counts[row.company_code] = (counts[row.company_code] || 0) + 1;
    }

    console.log(`Successfully imported: ${inserted} records`);

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        updated: 0,
        skipped,
        warnings,
        counts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        details: error.toString()
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
