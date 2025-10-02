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
  period_start?: string;
  period_end: string;
  deduction_groups?: any;
  special_effects?: any;
  report_groups?: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: rows } = await req.json();

    if (!Array.isArray(rows)) {
      throw new Error('Expected array of rows');
    }

    console.log(`Processing ${rows.length} rows from workbook`);

    const validCompanies = ['OZC', '72R', '72S'];
    const expandedRows: PayCycleRow[] = [];
    let skipped = 0;

    // Process and expand rows
    for (const row of rows) {
      // Skip empty rows
      if (!row['wk#'] && !row['period_end']) {
        skipped++;
        continue;
      }

      const companyCode = (row['company_code'] || '').trim().toUpperCase();
      const weekNumber = parseInt(row['wk#']);
      
      // Validate required fields
      if (!weekNumber || !row['in_date'] || !row['out_date'] || !row['pay_date'] || !row['period_end']) {
        console.warn('Skipping row with missing required fields:', row);
        skipped++;
        continue;
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(row['in_date']) || !dateRegex.test(row['out_date']) || 
          !dateRegex.test(row['pay_date']) || !dateRegex.test(row['period_end'])) {
        console.warn('Skipping row with invalid date format:', row);
        skipped++;
        continue;
      }

      const baseRow: Omit<PayCycleRow, 'company_code'> = {
        week_number: weekNumber,
        in_date: row['in_date'],
        out_date: row['out_date'],
        pay_date: row['pay_date'],
        period_start: row['period_start'],
        period_end: row['period_end'],
        deduction_groups: row['deduction_groups'] || {},
        special_effects: row['special_effects'] || {},
        report_groups: row['report_groups'] || {},
      };

      // Expand "ALL" or use specific company
      if (companyCode === 'ALL') {
        for (const company of validCompanies) {
          expandedRows.push({ ...baseRow, company_code: company });
        }
      } else if (validCompanies.includes(companyCode)) {
        expandedRows.push({ ...baseRow, company_code: companyCode });
      } else {
        console.warn('Skipping row with invalid company_code:', companyCode);
        skipped++;
      }
    }

    console.log(`Expanded to ${expandedRows.length} rows (skipped ${skipped})`);

    // Upsert rows
    const { error: upsertError } = await supabase
      .from('pay_cycles')
      .upsert(expandedRows, {
        onConflict: 'company_code,week_number,period_end',
      });

    if (upsertError) throw upsertError;

    // Count by company
    const counts: Record<string, number> = {};
    for (const row of expandedRows) {
      counts[row.company_code] = (counts[row.company_code] || 0) + 1;
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: expandedRows.length,
        skipped,
        counts,
        expandedData: expandedRows,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
