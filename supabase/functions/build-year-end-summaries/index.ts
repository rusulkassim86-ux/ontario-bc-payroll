import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BuildSummariesRequest {
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

    const { taxYear, employeeIds }: BuildSummariesRequest = await req.json();

    // Get all active employees or specific ones
    let employeeQuery = supabase
      .from('employees')
      .select('*')
      .eq('status', 'active');

    if (employeeIds && employeeIds.length > 0) {
      employeeQuery = employeeQuery.in('id', employeeIds);
    }

    const { data: employees, error: employeesError } = await employeeQuery;

    if (employeesError) {
      throw new Error(`Failed to fetch employees: ${employeesError.message}`);
    }

    if (!employees || employees.length === 0) {
      throw new Error('No employees found');
    }

    const processedEmployees = [];
    const errors = [];

    // Build year-end summary for each employee
    for (const employee of employees) {
      try {
        // Use the database function to build the summary
        const { data: summaryId, error: summaryError } = await supabase
          .rpc('build_employee_year_end_summary', {
            p_employee_id: employee.id,
            p_tax_year: taxYear
          });

        if (summaryError) {
          errors.push({
            employee_number: employee.employee_number,
            error: `Failed to build summary: ${summaryError.message}`
          });
          continue;
        }

        processedEmployees.push({
          employee_id: employee.id,
          employee_number: employee.employee_number,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          summary_id: summaryId
        });

      } catch (error: any) {
        errors.push({
          employee_number: employee.employee_number,
          error: `Unexpected error: ${error.message}`
        });
      }
    }

    // Get the built summaries with totals
    const { data: summaries, error: summariesError } = await supabase
      .from('employee_year_end_summary')
      .select(`
        *,
        employee:employee_id (
          employee_number,
          first_name,
          last_name
        )
      `)
      .eq('tax_year', taxYear)
      .in('employee_id', processedEmployees.map(p => p.employee_id));

    if (summariesError) {
      console.error('Failed to fetch built summaries:', summariesError);
    }

    const totalEmploymentIncome = summaries?.reduce((sum, s) => sum + s.total_employment_income, 0) || 0;
    const totalTaxes = summaries?.reduce((sum, s) => sum + s.total_income_tax, 0) || 0;
    const totalCPP = summaries?.reduce((sum, s) => sum + s.total_cpp_contributions, 0) || 0;
    const totalEI = summaries?.reduce((sum, s) => sum + s.total_ei_premiums, 0) || 0;

    console.log(`Built year-end summaries for ${processedEmployees.length} employees for tax year ${taxYear}`);

    return new Response(
      JSON.stringify({
        success: true,
        employee_count: processedEmployees.length,
        processed_employees: processedEmployees,
        errors: errors,
        totals: {
          total_employment_income: totalEmploymentIncome,
          total_taxes: totalTaxes,
          total_cpp: totalCPP,
          total_ei: totalEI
        },
        summaries: summaries || [],
        message: `Built year-end summaries for ${processedEmployees.length} employees`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in build-year-end-summaries function:', error);
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