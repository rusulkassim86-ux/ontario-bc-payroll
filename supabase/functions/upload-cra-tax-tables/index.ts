import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaxTableRow {
  jurisdiction: string;
  tax_year: number;
  pay_period_type: string;
  income_from: number;
  income_to: number;
  tax_amount: number;
  effective_start: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const taxYear = parseInt(formData.get('tax_year') as string);

    if (!file) {
      throw new Error('No file provided');
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const taxTableRows: TaxTableRow[] = [];
    const errors: string[] = [];

    // Process rows (skip header)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      
      try {
        const taxTableRow: TaxTableRow = {
          jurisdiction: row[0]?.toString().toLowerCase() || '',
          tax_year: taxYear,
          pay_period_type: row[1]?.toString().toLowerCase() || 'biweekly',
          income_from: parseFloat(row[2]) || 0,
          income_to: parseFloat(row[3]) || 0,
          tax_amount: parseFloat(row[4]) || 0,
          effective_start: new Date().toISOString().split('T')[0],
        };

        // Validate required fields
        if (!taxTableRow.jurisdiction || taxTableRow.income_from < 0 || taxTableRow.income_to <= taxTableRow.income_from) {
          errors.push(`Row ${i + 1}: Invalid data`);
          continue;
        }

        taxTableRows.push(taxTableRow);
      } catch (error: any) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    // Insert tax table rows
    let insertedCount = 0;
    if (taxTableRows.length > 0) {
      const { data, error } = await supabase
        .from('cra_tax_tables')
        .insert(taxTableRows)
        .select();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      insertedCount = data?.length || 0;
    }

    console.log(`Processed ${taxTableRows.length} tax table rows`);

    return new Response(
      JSON.stringify({
        success: true,
        imported_count: insertedCount,
        errors: errors,
        message: `Successfully imported ${insertedCount} tax table entries`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in upload-cra-tax-tables function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});