import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateRequest {
  taxYear: number;
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

    const { taxYear }: ValidateRequest = await req.json();

    const validationResults = {
      is_ready: true,
      warnings: [] as string[],
      errors: [] as string[],
      employee_issues: [] as any[],
      system_checks: {
        tax_tables_loaded: false,
        paycode_mappings_configured: false,
        cpp_ei_rates_configured: false,
        year_end_summaries_built: false
      },
      summary: {
        total_employees: 0,
        employees_with_income: 0,
        employees_missing_sin: 0,
        employees_wrong_province: 0,
        total_employment_income: 0,
        total_taxes: 0
      }
    };

    // Check if CRA tax tables are loaded for the year
    const { data: taxTables, error: taxTablesError } = await supabase
      .from('cra_tax_tables')
      .select('*')
      .eq('tax_year', taxYear)
      .eq('is_active', true)
      .limit(1);

    if (taxTablesError) {
      validationResults.errors.push(`Failed to check tax tables: ${taxTablesError.message}`);
    } else {
      validationResults.system_checks.tax_tables_loaded = (taxTables?.length || 0) > 0;
      if (!validationResults.system_checks.tax_tables_loaded) {
        validationResults.errors.push(`No CRA tax tables loaded for ${taxYear}`);
      }
    }

    // Check if paycode CRA mappings are configured
    const { data: mappings, error: mappingsError } = await supabase
      .from('paycode_cra_mapping')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (mappingsError) {
      validationResults.errors.push(`Failed to check paycode mappings: ${mappingsError.message}`);
    } else {
      validationResults.system_checks.paycode_mappings_configured = (mappings?.length || 0) > 0;
      if (!validationResults.system_checks.paycode_mappings_configured) {
        validationResults.errors.push('No paycode CRA mappings configured');
      }
    }

    // Check if CPP/EI rates are configured for the year
    const { data: cppEiRates, error: cppEiError } = await supabase
      .from('cpp_ei_rules')
      .select('*')
      .eq('tax_year', taxYear)
      .eq('is_active', true)
      .limit(1);

    if (cppEiError) {
      validationResults.errors.push(`Failed to check CPP/EI rates: ${cppEiError.message}`);
    } else {
      validationResults.system_checks.cpp_ei_rates_configured = (cppEiRates?.length || 0) > 0;
      if (!validationResults.system_checks.cpp_ei_rates_configured) {
        validationResults.errors.push(`No CPP/EI rates configured for ${taxYear}`);
      }
    }

    // Check employees and their year-end readiness
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select(`
        *,
        employee_year_end_summary (
          total_employment_income,
          total_income_tax,
          is_finalized
        )
      `)
      .eq('status', 'active');

    if (employeesError) {
      validationResults.errors.push(`Failed to fetch employees: ${employeesError.message}`);
    } else if (employees) {
      validationResults.summary.total_employees = employees.length;

      for (const employee of employees) {
        const issues = [];
        
        // Check for missing SIN
        if (!employee.sin_encrypted) {
          issues.push('Missing SIN');
          validationResults.summary.employees_missing_sin++;
        }

        // Check province (ON/BC only)
        if (!employee.province_code || !['ON', 'BC'].includes(employee.province_code)) {
          issues.push(`Invalid province: ${employee.province_code || 'None'} (must be ON or BC)`);
          validationResults.summary.employees_wrong_province++;
        }

        // Check year-end summary
        const yearEndSummary = employee.employee_year_end_summary?.find(
          (s: any) => s && s.total_employment_income > 0
        );

        if (yearEndSummary) {
          validationResults.summary.employees_with_income++;
          validationResults.summary.total_employment_income += yearEndSummary.total_employment_income;
          validationResults.summary.total_taxes += yearEndSummary.total_income_tax || 0;
        } else {
          issues.push('No employment income recorded');
        }

        // Check if terminated employees have ROE
        if (employee.status === 'terminated' && employee.termination_date) {
          const { data: roeSlips } = await supabase
            .from('roe_slips')
            .select('*')
            .eq('employee_id', employee.id);

          if (!roeSlips || roeSlips.length === 0) {
            issues.push('Terminated employee missing ROE slip');
          }
        }

        if (issues.length > 0) {
          validationResults.employee_issues.push({
            employee_number: employee.employee_number,
            employee_name: `${employee.first_name} ${employee.last_name}`,
            issues: issues
          });
        }
      }

      // Check if year-end summaries exist
      const employeesWithSummaries = employees.filter(e => 
        e.employee_year_end_summary && e.employee_year_end_summary.length > 0
      ).length;

      validationResults.system_checks.year_end_summaries_built = employeesWithSummaries > 0;
      
      if (employeesWithSummaries === 0) {
        validationResults.errors.push('No year-end summaries built - run "Build Year-End Summaries" first');
      } else if (employeesWithSummaries < employees.length) {
        validationResults.warnings.push(`${employees.length - employeesWithSummaries} employees missing year-end summaries`);
      }
    }

    // Generate overall warnings
    if (validationResults.summary.employees_missing_sin > 0) {
      validationResults.warnings.push(`${validationResults.summary.employees_missing_sin} employees missing SIN numbers`);
    }

    if (validationResults.summary.employees_wrong_province > 0) {
      validationResults.warnings.push(`${validationResults.summary.employees_wrong_province} employees with invalid province codes`);
    }

    if (validationResults.employee_issues.length > 0) {
      validationResults.warnings.push(`${validationResults.employee_issues.length} employees have data issues`);
    }

    // Determine overall readiness
    validationResults.is_ready = validationResults.errors.length === 0 && 
                                validationResults.employee_issues.length === 0;

    console.log(`Year-end validation for ${taxYear}: ${validationResults.is_ready ? 'READY' : 'NOT READY'}`);

    return new Response(
      JSON.stringify({
        success: true,
        validation_results: validationResults,
        tax_year: taxYear
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in validate-year-end-readiness function:', error);
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