import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateT4Request {
  companyId: string;
  taxYear: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { companyId, taxYear }: GenerateT4Request = await req.json();

    console.log(`Generating T4 slips for company ${companyId}, tax year ${taxYear}`);

    // Get all active employees for the company
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'active');

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      throw employeesError;
    }

    console.log(`Found ${employees?.length || 0} active employees`);

    const t4Slips = [];

    for (const employee of employees || []) {
      // Calculate T4 values from pay run data for the tax year
      const { data: payRunData, error: payRunError } = await supabase
        .from('pay_run_lines')
        .select(`
          *,
          pay_run:pay_runs!inner(
            pay_calendar:pay_calendars!inner(
              period_start,
              period_end
            )
          )
        `)
        .eq('employee_id', employee.id)
        .gte('pay_run.pay_calendar.period_start', `${taxYear}-01-01`)
        .lte('pay_run.pay_calendar.period_end', `${taxYear}-12-31`);

      if (payRunError) {
        console.error(`Error fetching pay data for employee ${employee.id}:`, payRunError);
        continue;
      }

      // Calculate totals for T4 boxes
      let totalEmploymentIncome = 0;
      let totalCppContributions = 0;
      let totalCppPensionableEarnings = 0;
      let totalEiPremiums = 0;
      let totalEiInsurableEarnings = 0;
      let totalIncomeTaxDeducted = 0;

      for (const payLine of payRunData || []) {
        totalEmploymentIncome += payLine.gross_pay || 0;
        totalCppContributions += (payLine.taxes?.cpp_employee || 0);
        totalCppPensionableEarnings += (payLine.earnings?.regular || 0) + (payLine.earnings?.overtime || 0);
        totalEiPremiums += (payLine.taxes?.ei_employee || 0);
        totalEiInsurableEarnings += (payLine.earnings?.regular || 0) + (payLine.earnings?.overtime || 0);
        totalIncomeTaxDeducted += (payLine.taxes?.federal_tax || 0) + (payLine.taxes?.provincial_tax || 0);
      }

      // Only create T4 if employee had earnings
      if (totalEmploymentIncome > 0) {
        const t4Data = {
          company_id: companyId,
          employee_id: employee.id,
          tax_year: taxYear,
          box_14_employment_income: totalEmploymentIncome,
          box_16_cpp_contributions: totalCppContributions,
          box_17_cpp_pensionable_earnings: totalCppPensionableEarnings,
          box_18_ei_premiums: totalEiPremiums,
          box_19_ei_insurable_earnings: totalEiInsurableEarnings,
          box_22_income_tax_deducted: totalIncomeTaxDeducted,
          box_24_ei_insurable_earnings: totalEiInsurableEarnings,
          box_26_cpp_pensionable_earnings: totalCppPensionableEarnings,
          status: 'draft',
        };

        // Insert T4 slip (use upsert to handle existing records)
        const { data: t4Slip, error: t4Error } = await supabase
          .from('t4_slips')
          .upsert(t4Data, {
            onConflict: 'company_id,employee_id,tax_year,status',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (t4Error) {
          console.error(`Error creating T4 for employee ${employee.id}:`, t4Error);
          continue;
        }

        t4Slips.push(t4Slip);
        console.log(`Created T4 slip for employee ${employee.employee_number}`);
      }
    }

    // Log the generation activity
    await supabase.rpc('create_audit_log', {
      p_action: 'GENERATE_T4_SLIPS',
      p_entity_type: 't4_batch',
      p_entity_id: companyId,
      p_metadata: {
        tax_year: taxYear,
        employee_count: employees?.length || 0,
        t4_count: t4Slips.length,
        generated_at: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${t4Slips.length} T4 slips for tax year ${taxYear}`,
        count: t4Slips.length,
        t4Slips: t4Slips
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error generating T4 slips:', error);
    return new Response(
      JSON.stringify({
        error: error?.message || 'Failed to generate T4 slips'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});