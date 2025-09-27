import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateT4Request {
  taxYear: number;
  employeeIds?: string[];
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

    const { taxYear, employeeIds }: GenerateT4Request = await req.json();

    // Get all employees or specific ones
    let employeeQuery = supabase
      .from('employees')
      .select(`
        *,
        employee_year_end_summary!inner (*)
      `)
      .eq('employee_year_end_summary.tax_year', taxYear)
      .eq('status', 'active');

    if (employeeIds && employeeIds.length > 0) {
      employeeQuery = employeeQuery.in('id', employeeIds);
    }

    const { data: employees, error: employeesError } = await employeeQuery;

    if (employeesError) {
      throw new Error(`Failed to fetch employees: ${employeesError.message}`);
    }

    if (!employees || employees.length === 0) {
      throw new Error('No eligible employees found for T4 generation');
    }

    // Get paycode CRA mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from('paycode_cra_mapping')
      .select('*')
      .eq('is_active', true);

    if (mappingsError) {
      throw new Error(`Failed to fetch CRA mappings: ${mappingsError.message}`);
    }

    const generatedSlips = [];
    const errors = [];

    // Generate T4 slip for each employee
    for (const employee of employees) {
      try {
        const yearEndSummary = employee.employee_year_end_summary[0];
        
        // Validate required fields
        const validationErrors = [];
        if (!employee.sin_encrypted) {
          validationErrors.push('Missing SIN');
        }
        if (!employee.province_code || !['ON', 'BC'].includes(employee.province_code)) {
          validationErrors.push('Invalid province (must be ON or BC)');
        }
        if (!yearEndSummary || yearEndSummary.total_employment_income <= 0) {
          validationErrors.push('No employment income for tax year');
        }

        if (validationErrors.length > 0) {
          errors.push({
            employee_number: employee.employee_number,
            errors: validationErrors
          });
          continue;
        }

        // Build T4 slip data
        const t4Data = {
          employee_id: employee.id,
          tax_year: taxYear,
          box_14_employment_income: yearEndSummary.total_employment_income,
          box_16_cpp_contributions: yearEndSummary.total_cpp_contributions,
          box_18_ei_premiums: yearEndSummary.total_ei_premiums,
          box_22_income_tax: yearEndSummary.total_income_tax,
          box_24_ei_insurable_earnings: yearEndSummary.total_ei_insurable,
          box_26_cpp_pensionable_earnings: yearEndSummary.total_cpp_pensionable,
          box_44_union_dues: yearEndSummary.total_union_dues,
          box_20_rpp_contributions: yearEndSummary.total_rpp_contributions,
          other_information_codes: {},
          province_of_employment: employee.province_code,
          employment_province_code: employee.province_code,
          payer_account_number: '123456789RP0001', // This should come from company settings
          status: 'generated'
        };

        // Insert or update T4 slip
        const { data: t4Slip, error: t4Error } = await supabase
          .from('t4_slips')
          .upsert(t4Data, {
            onConflict: 'employee_id,tax_year'
          })
          .select()
          .single();

        if (t4Error) {
          errors.push({
            employee_number: employee.employee_number,
            errors: [`Failed to create T4 slip: ${t4Error.message}`]
          });
          continue;
        }

        generatedSlips.push({
          employee_number: employee.employee_number,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          t4_slip_id: t4Slip.id,
          employment_income: yearEndSummary.total_employment_income
        });

      } catch (error: any) {
        errors.push({
          employee_number: employee.employee_number,
          errors: [`Unexpected error: ${error.message}`]
        });
      }
    }

    // Create submission record
    const { data: submission, error: submissionError } = await supabase
      .from('cra_submissions')
      .insert({
        company_id: employees[0].company_id,
        submission_type: 't4',
        tax_year: taxYear,
        employee_count: generatedSlips.length,
        status: 'generated',
        details_json: {
          generated_slips: generatedSlips,
          errors: errors
        },
        errors_json: errors
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Failed to create submission record:', submissionError);
    }

    console.log(`Generated ${generatedSlips.length} T4 slips for tax year ${taxYear}`);

    return new Response(
      JSON.stringify({
        success: true,
        employee_count: generatedSlips.length,
        generated_slips: generatedSlips,
        errors: errors,
        submission_id: submission?.id,
        message: `Generated T4 slips for ${generatedSlips.length} employees`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in generate-t4-slips-year function:', error);
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