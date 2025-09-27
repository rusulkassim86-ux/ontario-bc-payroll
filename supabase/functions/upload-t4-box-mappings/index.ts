import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface T4BoxMappingRow {
  pay_code_id?: string;
  deduction_code_id?: string;
  t4_box: string;
  box_description: string;
  mapping_type: string;
  calculation_method: string;
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

    if (!file) {
      throw new Error('No file provided');
    }

    // Read CSV file
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());

    // Get pay codes and deduction codes for lookup
    const { data: payCodes, error: payCodesError } = await supabase
      .from('pay_codes')
      .select('id, code');

    const { data: deductionCodes, error: deductionCodesError } = await supabase
      .from('deduction_codes')
      .select('id, code');

    if (payCodesError || deductionCodesError) {
      throw new Error('Failed to fetch pay codes or deduction codes');
    }

    const payCodeMap = new Map(payCodes?.map(pc => [pc.code, pc.id]) || []);
    const deductionCodeMap = new Map(deductionCodes?.map(dc => [dc.code, dc.id]) || []);

    const mappingRows: T4BoxMappingRow[] = [];
    const errors: string[] = [];

    // Box descriptions mapping
    const boxDescriptions: { [key: string]: string } = {
      '14': 'Employment income',
      '16': 'CPP contributions',
      '18': 'EI premiums',
      '20': 'RPP contributions',
      '22': 'Income tax deducted',
      '24': 'EI insurable earnings',
      '26': 'CPP pensionable earnings',
      '42': 'Employment commissions',
      '44': 'Union dues',
      '46': 'Charitable donations',
    };

    // Process rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      try {
        const payCode = values[0] || '';
        const deductionCode = values[1] || '';
        const t4Box = values[2] || '';
        const mappingType = values[3] || 'earning';
        const calculationMethod = values[4] || 'sum';

        if (!t4Box) {
          errors.push(`Row ${i + 1}: T4 box is required`);
          continue;
        }

        let payCodeId: string | undefined;
        let deductionCodeId: string | undefined;

        if (payCode) {
          payCodeId = payCodeMap.get(payCode);
          if (!payCodeId) {
            errors.push(`Row ${i + 1}: Pay code '${payCode}' not found`);
            continue;
          }
        }

        if (deductionCode) {
          deductionCodeId = deductionCodeMap.get(deductionCode);
          if (!deductionCodeId) {
            errors.push(`Row ${i + 1}: Deduction code '${deductionCode}' not found`);
            continue;
          }
        }

        if (!payCodeId && !deductionCodeId) {
          errors.push(`Row ${i + 1}: Either pay code or deduction code is required`);
          continue;
        }

        const mappingRow: T4BoxMappingRow = {
          pay_code_id: payCodeId,
          deduction_code_id: deductionCodeId,
          t4_box: t4Box,
          box_description: boxDescriptions[t4Box] || `Box ${t4Box}`,
          mapping_type: mappingType,
          calculation_method: calculationMethod,
        };

        mappingRows.push(mappingRow);
      } catch (error: any) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    // Insert T4 box mappings
    let insertedCount = 0;
    if (mappingRows.length > 0) {
      const { data, error } = await supabase
        .from('t4_box_mappings')
        .insert(mappingRows)
        .select();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      insertedCount = data?.length || 0;
    }

    console.log(`Processed ${mappingRows.length} T4 box mappings`);

    return new Response(
      JSON.stringify({
        success: true,
        imported_count: insertedCount,
        errors: errors,
        message: `Successfully imported ${insertedCount} T4 box mappings`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in upload-t4-box-mappings function:', error);
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