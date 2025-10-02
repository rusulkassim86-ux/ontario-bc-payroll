import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { payCycleId, companyCode } = await req.json();

    console.log('Processing payroll for cycle:', payCycleId, 'company:', companyCode);

    // Start payroll processing
    const { data: statusId, error: startError } = await supabase
      .rpc('start_payroll_processing', {
        p_pay_cycle_id: payCycleId,
        p_company_code: companyCode
      });

    if (startError) throw startError;

    // Get pay cycle details
    const { data: payCycle, error: cycleError } = await supabase
      .from('pay_cycles')
      .select('*')
      .eq('id', payCycleId)
      .single();

    if (cycleError) throw cycleError;

    // Get all active employees for this company
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, employee_number, first_name, last_name, company_code')
      .eq('company_code', companyCode)
      .eq('status', 'active');

    if (empError) throw empError;

    let totalHours = 0;
    let totalGross = 0;
    let totalNet = 0;
    let processedCount = 0;

    // Process each employee
    for (const employee of employees || []) {
      try {
        // Get timesheets for this employee in the pay period
        const { data: timesheets, error: timesheetError } = await supabase
          .from('timesheets')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('pay_calendar_id', payCycleId)
          .gte('work_date', payCycle.period_start)
          .lte('work_date', payCycle.period_end);

        if (timesheetError) {
          console.error('Error fetching timesheets for employee:', employee.id, timesheetError);
          continue;
        }

        // Calculate hours by pay code
        const hoursByCode: Record<string, number> = {};
        let employeeHours = 0;

        for (const ts of timesheets || []) {
          const hours = ts.hours || 0;
          const payCode = ts.pay_code || 'REG';
          
          hoursByCode[payCode] = (hoursByCode[payCode] || 0) + hours;
          employeeHours += hours;
        }

        // Get employee rate
        const { data: rate, error: rateError } = await supabase
          .from('employee_rates')
          .select('*')
          .eq('employee_id', employee.id)
          .lte('effective_from', payCycle.period_end)
          .or(`effective_to.is.null,effective_to.gte.${payCycle.period_end}`)
          .order('effective_from', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rateError) {
          console.error('Error fetching rate for employee:', employee.id, rateError);
          continue;
        }

        const baseRate = rate?.base_rate || 0;

        // Calculate gross pay (simplified - would normally use calculatePayroll service)
        let grossPay = 0;
        for (const [code, hours] of Object.entries(hoursByCode)) {
          const multiplier = code.includes('OT') ? 1.5 : 1;
          grossPay += hours * baseRate * multiplier;
        }

        // Simplified deductions (would normally calculate CPP, EI, taxes)
        const cpp = grossPay * 0.0595;
        const ei = grossPay * 0.0163;
        const federalTax = grossPay * 0.15;
        const provincialTax = grossPay * 0.10;
        const totalDeductions = cpp + ei + federalTax + provincialTax;
        const netPay = grossPay - totalDeductions;

        // Create pay run line
        const { error: payLineError } = await supabase
          .from('pay_run_lines')
          .insert({
            pay_run_id: payCycleId, // Using cycle ID as run ID for now
            employee_id: employee.id,
            gross_pay: grossPay,
            net_pay: netPay,
            taxes: {
              cpp_employee: cpp,
              ei_employee: ei,
              federal_tax: federalTax,
              provincial_tax: provincialTax
            },
            earnings: hoursByCode,
            ytd_totals: {
              gross: grossPay,
              cpp: cpp,
              ei: ei
            }
          });

        if (payLineError) {
          console.error('Error creating pay line for employee:', employee.id, payLineError);
          continue;
        }

        totalHours += employeeHours;
        totalGross += grossPay;
        totalNet += netPay;
        processedCount++;

        // Update progress
        await supabase
          .from('payroll_cycle_status')
          .update({
            processed_employees: processedCount,
            total_hours: totalHours,
            total_gross: totalGross,
            total_net: totalNet
          })
          .eq('id', statusId);

      } catch (error) {
        console.error('Error processing employee:', employee.id, error);
        // Continue with next employee
      }
    }

    // Complete processing
    const { error: completeError } = await supabase
      .rpc('complete_payroll_processing', {
        p_status_id: statusId,
        p_total_hours: totalHours,
        p_total_gross: totalGross,
        p_total_net: totalNet
      });

    if (completeError) throw completeError;

    return new Response(
      JSON.stringify({
        success: true,
        statusId,
        summary: {
          totalEmployees: employees?.length || 0,
          processedEmployees: processedCount,
          totalHours,
          totalGross,
          totalNet
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Payroll processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});