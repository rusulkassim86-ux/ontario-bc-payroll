import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { tax_year, environment = 'test' } = await req.json();

    // Get company settings
    const { data: settings } = await supabase
      .from('company_settings')
      .select('*')
      .eq('company_id', profile.company_id)
      .single();

    if (!settings?.cra_bn_rp || !settings?.transmitter_name) {
      throw new Error('Missing CRA filing credentials. Please configure BN, WAC, and transmitter contact in settings.');
    }

    // Get T4 slips for the tax year
    const { data: t4Slips, error: slipsError } = await supabase
      .from('t4_slips')
      .select(`
        *,
        employees:employee_id (
          first_name,
          last_name,
          sin_encrypted,
          address
        )
      `)
      .eq('tax_year', tax_year)
      .eq('status', 'approved');

    if (slipsError) throw slipsError;
    if (!t4Slips || t4Slips.length === 0) {
      throw new Error('No approved T4 slips found for this tax year');
    }

    // Validate T4 data
    const errors: string[] = [];
    t4Slips.forEach((slip: any, index: number) => {
      if (!slip.employees?.sin_encrypted) {
        errors.push(`Employee ${index + 1}: Missing SIN`);
      }
      if (!slip.box_14_employment_income) {
        errors.push(`Employee ${index + 1}: Missing employment income (Box 14)`);
      }
    });

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          errors: errors,
          message: 'T4 data validation failed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Generate T4 XML according to CRA schema
    const xml = generateT4XML({
      environment,
      transmitter: {
        bn: settings.cra_bn_rp,
        name: settings.transmitter_name,
        email: settings.transmitter_email || '',
        phone: settings.transmitter_phone || ''
      },
      taxYear: tax_year,
      slips: t4Slips
    });

    // Create filing record
    const { data: filing } = await supabase
      .from('cra_filing_records')
      .insert({
        company_id: profile.company_id,
        tax_year: tax_year,
        filing_type: 't4',
        file_format: 'xml',
        submission_status: environment === 'production' ? 'pending' : 'test',
        filed_by: user.id
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        filing_id: filing?.id,
        xml: xml,
        employee_count: t4Slips.length,
        environment: environment,
        message: `T4 XML generated for ${t4Slips.length} employees`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in generate-t4-xml function:', error);
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

function generateT4XML(params: any): string {
  const { environment, transmitter, taxYear, slips } = params;
  
  const isProduction = environment === 'production';
  
  // Calculate totals
  const totals = slips.reduce((acc: any, slip: any) => ({
    box14: acc.box14 + (slip.box_14_employment_income || 0),
    box16: acc.box16 + (slip.box_16_employee_cpp || 0),
    box18: acc.box18 + (slip.box_18_employee_ei || 0),
    box22: acc.box22 + (slip.box_22_income_tax || 0),
  }), { box14: 0, box16: 0, box18: 0, box22: 0 });

  return `<?xml version="1.0" encoding="UTF-8"?>
<T4Return xmlns="http://www.cra-arc.gc.ca/xmlns/T4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Transmitter>
    <BusinessNumber>${transmitter.bn}</BusinessNumber>
    <Name>${escapeXml(transmitter.name)}</Name>
    <EmailAddress>${escapeXml(transmitter.email)}</EmailAddress>
    <PhoneNumber>${escapeXml(transmitter.phone)}</PhoneNumber>
  </Transmitter>
  <Return>
    <TaxYear>${taxYear}</TaxYear>
    <Environment>${isProduction ? 'Production' : 'Test'}</Environment>
    <Summary>
      <TotalSlips>${slips.length}</TotalSlips>
      <TotalBox14>${totals.box14.toFixed(2)}</TotalBox14>
      <TotalBox16>${totals.box16.toFixed(2)}</TotalBox16>
      <TotalBox18>${totals.box18.toFixed(2)}</TotalBox18>
      <TotalBox22>${totals.box22.toFixed(2)}</TotalBox22>
    </Summary>
    ${slips.map((slip: any) => `
    <T4Slip>
      <EmployeeSIN>${slip.employees?.sin_encrypted || '000000000'}</EmployeeSIN>
      <EmployeeFirstName>${escapeXml(slip.employees?.first_name || '')}</EmployeeFirstName>
      <EmployeeLastName>${escapeXml(slip.employees?.last_name || '')}</EmployeeLastName>
      <Box14>${(slip.box_14_employment_income || 0).toFixed(2)}</Box14>
      <Box16>${(slip.box_16_employee_cpp || 0).toFixed(2)}</Box16>
      <Box18>${(slip.box_18_employee_ei || 0).toFixed(2)}</Box18>
      <Box22>${(slip.box_22_income_tax || 0).toFixed(2)}</Box22>
      ${slip.box_44_union_dues ? `<Box44>${slip.box_44_union_dues.toFixed(2)}</Box44>` : ''}
    </T4Slip>`).join('\n')}
  </Return>
</T4Return>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
