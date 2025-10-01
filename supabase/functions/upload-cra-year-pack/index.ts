import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user and company
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) throw new Error('No company found');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) throw new Error('No file provided');

    // Extract year from filename (cra_year_pack_YYYY.xlsx)
    const yearMatch = file.name.match(/(\d{4})/);
    const taxYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const packData: any = {
      cpp: null,
      ei: null,
      federal_tax: [],
      provincial_tax: { ON: [], BC: [] }
    };

    // Parse CPP sheet
    if (workbook.SheetNames.includes('CPP')) {
      const sheet = workbook.Sheets['CPP'];
      const data = XLSX.utils.sheet_to_json(sheet);
      if (data[0]) packData.cpp = data[0];
    }

    // Parse EI sheet
    if (workbook.SheetNames.includes('EI')) {
      const sheet = workbook.Sheets['EI'];
      const data = XLSX.utils.sheet_to_json(sheet);
      if (data[0]) packData.ei = data[0];
    }

    // Parse Federal Tax sheet
    if (workbook.SheetNames.includes('Federal')) {
      const sheet = workbook.Sheets['Federal'];
      packData.federal_tax = XLSX.utils.sheet_to_json(sheet);
    }

    // Parse Provincial Tax sheets
    for (const province of ['ON', 'BC']) {
      if (workbook.SheetNames.includes(province)) {
        const sheet = workbook.Sheets[province];
        packData.provincial_tax[province] = XLSX.utils.sheet_to_json(sheet);
      }
    }

    // Deactivate existing active pack for this year
    await supabase
      .from('cra_year_packs')
      .update({ is_active: false })
      .eq('company_id', profile.company_id)
      .eq('tax_year', taxYear);

    // Insert new year pack
    const { data: yearPack, error: packError } = await supabase
      .from('cra_year_packs')
      .insert({
        company_id: profile.company_id,
        tax_year: taxYear,
        uploaded_by: user.id,
        filename: file.name,
        pack_data: packData,
        is_active: true
      })
      .select()
      .single();

    if (packError) throw packError;

    // Update CPP/EI rules
    if (packData.cpp) {
      await supabase
        .from('cpp_ei_rules')
        .upsert({
          tax_year: taxYear,
          cpp_rate_employee: packData.cpp.employee_rate || 0.0595,
          cpp_rate_employer: packData.cpp.employer_rate || 0.0595,
          cpp_basic_exemption: packData.cpp.basic_exemption || 3500,
          cpp_max_pensionable: packData.cpp.max_pensionable || 68500,
          ei_rate_employee: packData.ei?.employee_rate || 0.0166,
          ei_rate_employer: packData.ei?.employer_rate || 0.02324,
          ei_max_insurable: packData.ei?.max_insurable || 63600,
          effective_start: `${taxYear}-01-01`,
          is_active: true
        });
    }

    // Update company settings to use this tax year
    await supabase
      .from('company_settings')
      .upsert({
        company_id: profile.company_id,
        active_tax_year: taxYear
      }, {
        onConflict: 'company_id'
      });

    // Calculate rate changes if previous year exists
    const { data: prevPack } = await supabase
      .from('cra_year_packs')
      .select('pack_data')
      .eq('company_id', profile.company_id)
      .eq('tax_year', taxYear - 1)
      .single();

    const changes: any[] = [];
    if (prevPack) {
      // Compare CPP rates
      if (packData.cpp && prevPack.pack_data.cpp) {
        const cppChange = packData.cpp.employee_rate - prevPack.pack_data.cpp.employee_rate;
        if (cppChange !== 0) {
          changes.push({
            type: 'CPP Employee Rate',
            old_value: prevPack.pack_data.cpp.employee_rate,
            new_value: packData.cpp.employee_rate,
            change: cppChange
          });
        }
      }

      // Compare EI rates
      if (packData.ei && prevPack.pack_data.ei) {
        const eiChange = packData.ei.employee_rate - prevPack.pack_data.ei.employee_rate;
        if (eiChange !== 0) {
          changes.push({
            type: 'EI Employee Rate',
            old_value: prevPack.pack_data.ei.employee_rate,
            new_value: packData.ei.employee_rate,
            change: eiChange
          });
        }
      }

      if (changes.length > 0) {
        await supabase
          .from('cra_rate_changes')
          .insert({
            company_id: profile.company_id,
            from_year: taxYear - 1,
            to_year: taxYear,
            change_type: 'year_pack_upload',
            change_details: { changes }
          });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        year_pack_id: yearPack.id,
        tax_year: taxYear,
        changes: changes,
        message: `CRA Year Pack ${taxYear} uploaded and activated successfully`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in upload-cra-year-pack function:', error);
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
