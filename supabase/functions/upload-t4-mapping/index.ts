import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MappingRow {
  company_code: string;
  item_type: string;
  item_code: string;
  item_name: string;
  contributes_box14: string;
  insurable_ei: string;
  pensionable_cpp: string;
  cra_box_code: string;
  cra_other_info: string;
  notes: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's company and role
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['org_admin', 'payroll_admin'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const companyCode = formData.get('company_code') as string;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!companyCode || !['OZC', '72R', '72S'].includes(companyCode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid company code' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet) as MappingRow[];

    if (!jsonData || jsonData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'File is empty or invalid' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validation
    const errors: string[] = [];
    const requiredHeaders = [
      'company_code',
      'item_type',
      'item_code',
      'item_name',
      'contributes_box14',
      'insurable_ei',
      'pensionable_cpp',
    ];

    const firstRow = jsonData[0];
    for (const header of requiredHeaders) {
      if (!(header in firstRow)) {
        errors.push(`Missing required header: ${header}`);
      }
    }

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', errors }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate each row
    const validItemTypes = ['EARNING', 'DEDUCTION', 'BENEFIT', 'TAX'];
    const validBoxCodes = ['14', '16', '18', '20', '22', '24', '26', '40', '44', ''];

    jsonData.forEach((row, index) => {
      if (!['OZC', '72R', '72S'].includes(row.company_code)) {
        errors.push(`Row ${index + 2}: Invalid company_code '${row.company_code}'`);
      }
      if (!validItemTypes.includes(row.item_type)) {
        errors.push(`Row ${index + 2}: Invalid item_type '${row.item_type}'`);
      }
      if (!['Y', 'N'].includes(row.contributes_box14?.toUpperCase())) {
        errors.push(`Row ${index + 2}: contributes_box14 must be Y or N`);
      }
      if (!['Y', 'N'].includes(row.insurable_ei?.toUpperCase())) {
        errors.push(`Row ${index + 2}: insurable_ei must be Y or N`);
      }
      if (!['Y', 'N'].includes(row.pensionable_cpp?.toUpperCase())) {
        errors.push(`Row ${index + 2}: pensionable_cpp must be Y or N`);
      }
      if (row.cra_box_code && !validBoxCodes.includes(row.cra_box_code)) {
        errors.push(`Row ${index + 2}: Invalid cra_box_code '${row.cra_box_code}'`);
      }
    });

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', errors }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the latest version for this company
    const { data: latestMapping } = await supabaseClient
      .from('t4_paycode_mapping')
      .select('version')
      .eq('company_code', companyCode)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const newVersion = (latestMapping?.version || 0) + 1;

    // Deactivate old mappings
    await supabaseClient
      .from('t4_paycode_mapping')
      .update({ is_active: false })
      .eq('company_code', companyCode);

    // Insert new mappings
    const insertData = jsonData.map((row) => ({
      company_id: profile.company_id,
      company_code: row.company_code,
      item_type: row.item_type,
      item_code: row.item_code,
      item_name: row.item_name,
      contributes_box14: row.contributes_box14.toUpperCase() === 'Y',
      insurable_ei: row.insurable_ei.toUpperCase() === 'Y',
      pensionable_cpp: row.pensionable_cpp.toUpperCase() === 'Y',
      cra_box_code: row.cra_box_code || null,
      cra_other_info: row.cra_other_info || null,
      notes: row.notes || null,
      version: newVersion,
      created_by: user.id,
    }));

    const { error: insertError } = await supabaseClient
      .from('t4_paycode_mapping')
      .insert(insertData);

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert mappings', details: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Uploaded ${insertData.length} T4 mappings for company ${companyCode}, version ${newVersion}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully uploaded ${insertData.length} mappings`,
        version: newVersion,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error uploading T4 mapping:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
