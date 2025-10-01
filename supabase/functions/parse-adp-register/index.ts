import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayCode {
  code: string;
  label: string;
  category: string;
  isEmployerContribution: boolean;
  mapsTo: string;
  glAccount?: string;
}

Deno.serve(async (req) => {
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

    console.log('Parsing ADP register file:', file.name);

    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    console.log('Parsed rows:', data.length);

    // Define known codes with their mappings
    const earningCodes: PayCode[] = [
      { code: 'REG', label: 'Regular Hours', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8000' },
      { code: 'O/T', label: 'Overtime', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8010' },
      { code: 'AVC', label: 'Auto Vacation', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8055' },
      { code: '37', label: 'Pers Day', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8055' },
      { code: '38', label: 'Float', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8055' },
      { code: 'E04', label: 'Bonus', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8010' },
      { code: 'E05', label: 'Overtime 2.0', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8010' },
      { code: 'E06', label: 'Retro Allowance', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8050' },
      { code: 'E08', label: 'Overtime 1.0', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8010' },
      { code: 'E09', label: 'Retro Non-Taxable', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8050' },
      { code: 'E11', label: 'Training', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8000' },
      { code: 'E12', label: 'Acting Pay', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8000' },
      { code: 'E13', label: 'Commission', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8010' },
      { code: 'E14', label: 'Shift Premium', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8010' },
      { code: 'BRV', label: 'Bereavement', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8055' },
      { code: 'MSC', label: 'Miscellaneous Reimbursement', category: 'Earning', isEmployerContribution: false, mapsTo: '14', glAccount: '8000' },
    ];

    const deductionCodes: PayCode[] = [
      { code: 'FED', label: 'Federal Tax', category: 'Tax', isEmployerContribution: false, mapsTo: '22', glAccount: '2040' },
      { code: 'EI', label: 'Employment Insurance', category: 'Tax', isEmployerContribution: false, mapsTo: '18', glAccount: '2030' },
      { code: 'CPP', label: 'Canada Pension Plan', category: 'Tax', isEmployerContribution: false, mapsTo: '16', glAccount: '2030' },
      { code: 'DP1', label: 'DPSP Employee Contribution', category: 'Retirement', isEmployerContribution: false, mapsTo: '20', glAccount: '2042' },
      { code: 'LTD', label: 'Long Term Disability', category: 'Benefit', isEmployerContribution: false, mapsTo: '85', glAccount: '2047' },
      { code: 'CPP_ER', label: 'CPP Employer Contribution', category: 'Tax', isEmployerContribution: true, mapsTo: '', glAccount: '8030' },
      { code: 'EI_ER', label: 'EI Employer Contribution', category: 'Tax', isEmployerContribution: true, mapsTo: '', glAccount: '8030' },
      { code: 'DP1_ER', label: 'DPSP Employer Contribution', category: 'Retirement', isEmployerContribution: true, mapsTo: '', glAccount: '2042' },
      { code: 'UNION', label: 'Union Dues', category: 'UnionDues', isEmployerContribution: false, mapsTo: '44', glAccount: '2045' },
    ];

    console.log('Inserting earning codes...');
    
    // Insert earning codes
    const { data: earningInserted, error: earningError } = await supabase
      .from('earning_codes')
      .upsert(
        earningCodes.map(code => ({
          code: code.code,
          description: code.label,
          company_id: (req.headers.get('x-company-id') || ''), // Get from request context
          is_taxable_federal: true,
          is_taxable_provincial: true,
          is_cpp_pensionable: true,
          is_ei_insurable: true,
          is_vacation_eligible: true,
          is_overtime: code.code.includes('O/T') || code.code.includes('E05') || code.code.includes('E08'),
          overtime_multiplier: code.code.includes('E05') ? 2.0 : (code.code.includes('O/T') || code.code.includes('E08') ? 1.5 : 1.0),
        })),
        { onConflict: 'code,company_id', ignoreDuplicates: false }
      );

    if (earningError) {
      console.error('Error inserting earning codes:', earningError);
      throw earningError;
    }

    console.log('Inserting deduction codes...');

    // Insert deduction codes
    const { data: deductionInserted, error: deductionError } = await supabase
      .from('deduction_codes')
      .upsert(
        deductionCodes.map(code => ({
          code: code.code,
          label: code.label,
          description: code.label,
          company_id: (req.headers.get('x-company-id') || ''),
          category: code.category,
          is_employer_contribution: code.isEmployerContribution,
          maps_to: code.mapsTo,
          calc_type: 'fixed',
          active: true,
        })),
        { onConflict: 'code,company_id', ignoreDuplicates: false }
      );

    if (deductionError) {
      console.error('Error inserting deduction codes:', deductionError);
      throw deductionError;
    }

    console.log('Creating paycode to CRA/GL mappings...');

    // Create paycode_to_cra_gl mappings
    const allCodes = [...earningCodes, ...deductionCodes];
    const glMappings = allCodes
      .filter(code => code.glAccount)
      .map(code => ({
        company_code: 'OZC', // Default to OZC, can be parameterized
        item_code: code.code,
        cra_box_code: code.mapsTo || null,
        gl_account: code.glAccount,
        active: true,
      }));

    const { data: glInserted, error: glError } = await supabase
      .from('paycode_to_cra_gl')
      .upsert(glMappings, { onConflict: 'company_code,item_code', ignoreDuplicates: false });

    if (glError) {
      console.error('Error inserting GL mappings:', glError);
      throw glError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          earningCodes: earningCodes.length,
          deductionCodes: deductionCodes.length,
          glMappings: glMappings.length,
        },
        codes: {
          earnings: earningCodes,
          deductions: deductionCodes,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error parsing ADP register:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
