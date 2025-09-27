import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ROEGenerationRequest {
  employeeId: string;
  lastDayWorked: string;
  reasonForIssuing: string;
  finalPayPeriodEnd: string;
  comments?: string;
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

    const { employeeId, lastDayWorked, reasonForIssuing, finalPayPeriodEnd, comments }: ROEGenerationRequest = await req.json();

    // Fetch employee details
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      throw new Error('Employee not found');
    }

    // Calculate insurable earnings and hours from pay run lines
    const { data: payRunLines, error: payRunError } = await supabase
      .from('pay_run_lines')
      .select(`
        *,
        pay_runs:pay_run_id (
          pay_calendars:pay_calendar_id (
            period_start,
            period_end
          )
        )
      `)
      .eq('employee_id', employeeId);

    if (payRunError) {
      throw new Error('Failed to fetch pay run data');
    }

    // Calculate totals for ROE
    let totalInsurableEarnings = 0;
    let totalInsurableHours = 0;
    let vacationPay = 0;
    let statutoryHolidayPay = 0;
    const payPeriodDetails: any[] = [];

    // Calculate 52 weeks of insurable earnings (or from hire date if less)
    const cutoffDate = new Date(lastDayWorked);
    cutoffDate.setDate(cutoffDate.getDate() - (52 * 7)); // 52 weeks back

    payRunLines?.forEach(line => {
      const payRun = (line as any).pay_runs;
      const payCalendar = payRun?.pay_calendars;
      
      if (payCalendar && new Date(payCalendar.period_end) <= new Date(lastDayWorked) &&
          new Date(payCalendar.period_start) >= cutoffDate) {
        
        const earnings = line.earnings as any || {};
        const grossPay = line.gross_pay || 0;
        
        // Sum EI insurable earnings (most earnings are EI insurable)
        totalInsurableEarnings += grossPay;
        
        // Extract vacation and stat holiday pay if tracked separately
        if (earnings.vacation_pay) vacationPay += earnings.vacation_pay;
        if (earnings.stat_holiday_pay) statutoryHolidayPay += earnings.stat_holiday_pay;
        
        // For hours, we'll estimate based on earnings and rate
        // This would need to be refined based on actual hour tracking
        totalInsurableHours += earnings.regular_hours || 0;
        totalInsurableHours += earnings.overtime_hours || 0;

        payPeriodDetails.push({
          period_start: payCalendar.period_start,
          period_end: payCalendar.period_end,
          insurable_earnings: grossPay,
          insurable_hours: (earnings.regular_hours || 0) + (earnings.overtime_hours || 0)
        });
      }
    });

    // Generate ROE number
    const { data: roeNumber, error: roeNumberError } = await supabase
      .rpc('generate_roe_number');

    if (roeNumberError) {
      throw new Error('Failed to generate ROE number');
    }

    // Create ROE slip
    const roeData = {
      company_id: employee.company_id,
      employee_id: employeeId,
      roe_number: roeNumber,
      first_day_worked: employee.hire_date,
      last_day_worked: lastDayWorked,
      final_pay_period_end: finalPayPeriodEnd,
      reason_for_issuing: reasonForIssuing,
      insurable_hours: Math.round(totalInsurableHours),
      insurable_earnings: Math.round(totalInsurableEarnings * 100) / 100,
      total_insurable_earnings: Math.round(totalInsurableEarnings * 100) / 100,
      vacation_pay: Math.round(vacationPay * 100) / 100,
      statutory_holiday_pay: Math.round(statutoryHolidayPay * 100) / 100,
      other_monies: {},
      pay_period_details: payPeriodDetails,
      comments: comments || '',
      status: 'generated'
    };

    const { data: roeSlip, error: insertError } = await supabase
      .from('roe_slips')
      .insert(roeData)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create ROE slip: ${insertError.message}`);
    }

    // Log compliance record
    await supabase
      .from('cra_compliance_log')
      .insert({
        company_id: employee.company_id,
        compliance_type: 'roe',
        entity_id: roeSlip.id,
        compliance_status: 'pending'
      });

    console.log(`Generated ROE ${roeNumber} for employee ${employee.employee_number}`);

    return new Response(
      JSON.stringify({
        success: true,
        roe_slip: roeSlip,
        roe_number: roeNumber,
        message: `ROE slip ${roeNumber} generated successfully`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in generate-roe-slip function:', error);
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