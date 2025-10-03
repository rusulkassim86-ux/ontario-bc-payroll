import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayCycleRow {
  company_code: string;
  pay_period_number: number;
  period_start: string;
  period_end: string;
  pay_date: string;
}

// Normalize date to YYYY-MM-DD
function normalizeDate(value: any): string | null {
  if (!value) return null;
  
  const dateStr = String(value).trim();
  
  // Handle YYYY-MM-DD or YYYY/MM/DD
  const match = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Try parsing as Date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

// Normalize headers (case-insensitive mapping)
function normalizeHeaders(row: any): any {
  const normalized: any = {};
  const headerMap: Record<string, string> = {
    'company': 'company_code',
    'company_code': 'company_code',
    'pay period': 'pay_period_number',
    'pay_period': 'pay_period_number',
    'payperiod': 'pay_period_number',
    'pay period start date': 'period_start',
    'period_start': 'period_start',
    'period start': 'period_start',
    'pay period end date': 'period_end',
    'period_end': 'period_end',
    'period end': 'period_end',
    'pay_date': 'pay_date',
    'paydate': 'pay_date',
  };
  
  for (const key in row) {
    const normalizedKey = key.toLowerCase().trim();
    const mappedKey = headerMap[normalizedKey];
    if (mappedKey) {
      normalized[mappedKey] = row[key];
    }
  }
  
  return normalized;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    let rows: any[] = [];

    // Parse CSV or XLSX
    if (file.name.endsWith('.csv')) {
      const text = new TextDecoder().decode(arrayBuffer);
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        return new Response(
          JSON.stringify({ error: 'CSV file is empty or has no data rows' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const headers = lines[0].split(',').map(h => h.trim());
      rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((h, i) => {
          row[h] = values[i];
        });
        return row;
      });
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(firstSheet);
    } else {
      return new Response(
        JSON.stringify({ error: 'Please upload CSV or XLSX file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'File contains no data rows' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process and validate rows
    const insertData: PayCycleRow[] = [];
    const warnings: string[] = [];
    let rowNum = 1;

    for (const rawRow of rows) {
      rowNum++;
      const row = normalizeHeaders(rawRow);

      // Validate required fields
      if (!row.company_code) {
        return new Response(
          JSON.stringify({ error: `Row ${rowNum}: missing 'company' field` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate company_code
      const company = String(row.company_code).trim().toUpperCase();
      if (!['OZC', '72R', '72S', 'ALL'].includes(company)) {
        return new Response(
          JSON.stringify({ error: `Row ${rowNum}: invalid company '${company}' (must be OZC, 72R, 72S, or ALL)` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate pay_period_number
      const payPeriodNum = parseInt(String(row.pay_period_number || '').trim());
      if (isNaN(payPeriodNum) || payPeriodNum < 1) {
        return new Response(
          JSON.stringify({ error: `Row ${rowNum}: invalid 'Pay Period' (must be ≥ 1)` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate and normalize dates
      const periodStart = normalizeDate(row.period_start);
      const periodEnd = normalizeDate(row.period_end);
      const payDate = normalizeDate(row.pay_date);

      if (!periodStart) {
        return new Response(
          JSON.stringify({ error: `Row ${rowNum}: invalid date in 'Pay Period Start Date' (expected YYYY-MM-DD)` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!periodEnd) {
        return new Response(
          JSON.stringify({ error: `Row ${rowNum}: invalid date in 'Pay Period end Date' (expected YYYY-MM-DD)` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!payDate) {
        return new Response(
          JSON.stringify({ error: `Row ${rowNum}: invalid date in 'pay_date' (expected YYYY-MM-DD)` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate period_start <= period_end
      if (periodStart > periodEnd) {
        return new Response(
          JSON.stringify({ error: `Row ${rowNum}: period_start (${periodStart}) must be ≤ period_end (${periodEnd})` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Expand ALL into OZC, 72R, 72S
      const companies = company === 'ALL' ? ['OZC', '72R', '72S'] : [company];
      
      for (const companyCode of companies) {
        insertData.push({
          company_code: companyCode,
          pay_period_number: payPeriodNum,
          period_start: periodStart,
          period_end: periodEnd,
          pay_date: payDate,
        });
      }
    }

    // Check for overlaps before inserting
    for (const row of insertData) {
      const { data: existing } = await supabase
        .from('pay_cycles')
        .select('id, period_start, period_end')
        .eq('company_code', row.company_code)
        .neq('pay_period_number', row.pay_period_number)
        .or(`and(period_start.lte.${row.period_end},period_end.gte.${row.period_start})`);

      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({
            error: `Overlapping period detected for ${row.company_code}: period ${row.period_start} to ${row.period_end} conflicts with existing cycle`
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Upsert all rows
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of insertData) {
      const { error: upsertError, status } = await supabase
        .from('pay_cycles')
        .upsert({
          company_code: row.company_code,
          pay_period_number: row.pay_period_number,
          period_start: row.period_start,
          period_end: row.period_end,
          pay_date: row.pay_date,
          status: 'scheduled',
        }, {
          onConflict: 'company_code,pay_period_number,period_end',
        });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        warnings.push(`Failed to insert/update ${row.company_code} period ${row.pay_period_number}: ${upsertError.message}`);
        skipped++;
      } else {
        // Check if it was an insert or update by trying to find existing
        const { data: existing } = await supabase
          .from('pay_cycles')
          .select('id')
          .eq('company_code', row.company_code)
          .eq('pay_period_number', row.pay_period_number)
          .eq('period_end', row.period_end)
          .maybeSingle();
        
        if (existing) {
          updated++;
        } else {
          inserted++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        updated,
        skipped,
        warnings,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error processing import:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
