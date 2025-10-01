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

    // Get company and settings
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();

    const { data: settings } = await supabase
      .from('company_settings')
      .select('*')
      .eq('company_id', profile.company_id)
      .single();

    if (!settings?.cra_bn_rp || !settings?.transmitter_name) {
      throw new Error('Missing CRA filing credentials. Please configure BN, WAC, and transmitter contact in settings.');
    }

    // Get year-end summaries for the tax year
    const { data: summaries, error: summariesError } = await supabase
      .from('employee_year_end_summary')
      .select(`
        *,
        employees:employee_id (
          id,
          employee_number,
          first_name,
          last_name,
          sin_encrypted,
          address,
          province_code,
          union_code
        )
      `)
      .eq('tax_year', tax_year)
      .eq('is_finalized', true);

    if (summariesError) throw summariesError;
    if (!summaries || summaries.length === 0) {
      throw new Error('No finalized year-end summaries found for this tax year. Please finalize employee year-end data first.');
    }

    // Validate employee data
    const errors: string[] = [];
    const validatedSlips: any[] = [];

    summaries.forEach((summary: any, index: number) => {
      const emp = summary.employees;
      const rowNum = index + 1;
      
      // Required field validation
      if (!emp?.sin_encrypted) {
        errors.push(`Row ${rowNum} (${emp?.first_name} ${emp?.last_name}): Missing SIN`);
      }
      if (!emp?.province_code) {
        errors.push(`Row ${rowNum} (${emp?.first_name} ${emp?.last_name}): Missing province`);
      }
      if (!summary.total_employment_income || summary.total_employment_income <= 0) {
        errors.push(`Row ${rowNum} (${emp?.first_name} ${emp?.last_name}): Missing or invalid employment income (Box 14)`);
      }

      // Box-level validation
      if (summary.total_cpp_contributions && !summary.total_cpp_pensionable) {
        errors.push(`Row ${rowNum} (${emp?.first_name} ${emp?.last_name}): CPP contributions reported (Box 16) but no pensionable earnings (Box 26)`);
      }
      if (summary.total_ei_premiums && !summary.total_ei_insurable) {
        errors.push(`Row ${rowNum} (${emp?.first_name} ${emp?.last_name}): EI premiums reported (Box 18) but no insurable earnings (Box 24)`);
      }

      if (errors.length === 0) {
        validatedSlips.push({
          employee: emp,
          summary: summary
        });
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

    // Generate T4 XML with all boxes
    const xml = generateT4XML({
      environment,
      transmitter: {
        bn: settings.cra_bn_rp,
        name: settings.transmitter_name,
        email: settings.transmitter_email || '',
        phone: settings.transmitter_phone || ''
      },
      employer: {
        bn: company?.cra_business_number || settings.cra_bn_rp,
        legal_name: company?.legal_name || company?.name,
        address: company?.address || {}
      },
      taxYear: tax_year,
      slips: validatedSlips
    });

    // Generate file hash for audit trail using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(xml);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create filing record with audit info
    const { data: filing, error: filingError } = await supabase
      .from('cra_filing_records')
      .insert({
        company_id: profile.company_id,
        tax_year: tax_year,
        filing_type: 't4',
        file_format: 'xml',
        submission_status: environment === 'production' ? 'generated' : 'test',
        filed_by: user.id,
        pack_data: {
          file_hash: fileHash,
          employee_count: validatedSlips.length,
          environment: environment,
          generated_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (filingError) throw filingError;

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        action: 'GENERATE_T4_XML',
        entity_type: 'cra_filing',
        entity_id: filing.id,
        actor_id: user.id,
        metadata: {
          tax_year: tax_year,
          environment: environment,
          employee_count: validatedSlips.length,
          file_hash: fileHash,
          timestamp: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        filing_id: filing.id,
        xml: xml,
        file_hash: fileHash,
        employee_count: validatedSlips.length,
        environment: environment,
        filename: `T4_${tax_year}_${environment}_${Date.now()}.xml`,
        message: `T4 XML generated for ${validatedSlips.length} employees`
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
  const { environment, transmitter, employer, taxYear, slips } = params;
  
  const isProduction = environment === 'production';
  
  // Calculate totals across all boxes
  const totals = slips.reduce((acc: any, slip: any) => {
    const s = slip.summary;
    return {
      box14: acc.box14 + (s.total_employment_income || 0),
      box16: acc.box16 + (s.total_cpp_contributions || 0),
      box18: acc.box18 + (s.total_ei_premiums || 0),
      box22: acc.box22 + (s.total_income_tax || 0),
      box24: acc.box24 + (s.total_ei_insurable || 0),
      box26: acc.box26 + (s.total_cpp_pensionable || 0),
      box44: acc.box44 + (s.total_union_dues || 0),
      box46: acc.box46 + (s.total_rpp_contributions || 0),
    };
  }, { box14: 0, box16: 0, box18: 0, box22: 0, box24: 0, box26: 0, box44: 0, box46: 0 });

  return `<?xml version="1.0" encoding="UTF-8"?>
<T4Return xmlns="http://www.cra-arc.gc.ca/xmlns/T4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Transmitter>
    <BusinessNumber>${transmitter.bn}</BusinessNumber>
    <Name>${escapeXml(transmitter.name)}</Name>
    <EmailAddress>${escapeXml(transmitter.email)}</EmailAddress>
    <PhoneNumber>${escapeXml(transmitter.phone)}</PhoneNumber>
  </Transmitter>
  <Employer>
    <BusinessNumber>${employer.bn}</BusinessNumber>
    <LegalName>${escapeXml(employer.legal_name)}</LegalName>
    <Address>
      <AddressLine1>${escapeXml(employer.address?.street || '')}</AddressLine1>
      <City>${escapeXml(employer.address?.city || '')}</City>
      <ProvinceCode>${employer.address?.province || 'ON'}</ProvinceCode>
      <PostalCode>${escapeXml(employer.address?.postal_code || '')}</PostalCode>
    </Address>
  </Employer>
  <Return>
    <TaxYear>${taxYear}</TaxYear>
    <Environment>${isProduction ? 'Production' : 'Test'}</Environment>
    <Summary>
      <TotalSlips>${slips.length}</TotalSlips>
      <TotalBox14>${totals.box14.toFixed(2)}</TotalBox14>
      <TotalBox16>${totals.box16.toFixed(2)}</TotalBox16>
      <TotalBox18>${totals.box18.toFixed(2)}</TotalBox18>
      <TotalBox22>${totals.box22.toFixed(2)}</TotalBox22>
      <TotalBox24>${totals.box24.toFixed(2)}</TotalBox24>
      <TotalBox26>${totals.box26.toFixed(2)}</TotalBox26>
      <TotalBox44>${totals.box44.toFixed(2)}</TotalBox44>
      <TotalBox46>${totals.box46.toFixed(2)}</TotalBox46>
    </Summary>
    ${slips.map((slip: any) => {
      const emp = slip.employee;
      const s = slip.summary;
      const isUnion = emp.union_code === '72S' || emp.employee_number?.startsWith('72S');
      
      return `
    <T4Slip>
      <EmployeeSIN>${emp.sin_encrypted || '000000000'}</EmployeeSIN>
      <EmployeeNumber>${escapeXml(emp.employee_number || '')}</EmployeeNumber>
      <EmployeeFirstName>${escapeXml(emp.first_name || '')}</EmployeeFirstName>
      <EmployeeLastName>${escapeXml(emp.last_name || '')}</EmployeeLastName>
      <EmployeeAddress>
        <AddressLine1>${escapeXml(emp.address?.street || '')}</AddressLine1>
        <City>${escapeXml(emp.address?.city || '')}</City>
        <ProvinceCode>${emp.province_code || 'ON'}</ProvinceCode>
        <PostalCode>${escapeXml(emp.address?.postal_code || '')}</PostalCode>
      </EmployeeAddress>
      <Box14>${(s.total_employment_income || 0).toFixed(2)}</Box14>
      ${s.total_cpp_contributions ? `<Box16>${s.total_cpp_contributions.toFixed(2)}</Box16>` : ''}
      ${s.total_ei_premiums ? `<Box18>${s.total_ei_premiums.toFixed(2)}</Box18>` : ''}
      ${s.total_income_tax ? `<Box22>${s.total_income_tax.toFixed(2)}</Box22>` : ''}
      ${s.total_ei_insurable ? `<Box24>${s.total_ei_insurable.toFixed(2)}</Box24>` : ''}
      ${s.total_cpp_pensionable ? `<Box26>${s.total_cpp_pensionable.toFixed(2)}</Box26>` : ''}
      ${isUnion && s.total_union_dues ? `<Box44>${s.total_union_dues.toFixed(2)}</Box44>` : ''}
      ${s.total_rpp_contributions ? `<Box46>${s.total_rpp_contributions.toFixed(2)}</Box46>` : ''}
      ${s.other_income?.box40 ? `<Box40>${s.other_income.box40.toFixed(2)}</Box40>` : ''}
      ${s.other_deductions?.box50 ? `<Box50>${s.other_deductions.box50.toFixed(2)}</Box50>` : ''}
      ${s.other_deductions?.box52 ? `<Box52>${s.other_deductions.box52.toFixed(2)}</Box52>` : ''}
      ${s.other_income?.box85 ? `<Box85>${s.other_income.box85.toFixed(2)}</Box85>` : ''}
    </T4Slip>`;
    }).join('\n')}
  </Return>
</T4Return>`;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
