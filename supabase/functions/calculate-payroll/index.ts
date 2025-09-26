import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayrollCalculationInput {
  employeeId: string;
  grossPay: number;
  payPeriodType: 'weekly' | 'biweekly' | 'monthly' | 'annual';
  province: string;
  taxYear: number;
  cppExempt: boolean;
  eiExempt: boolean;
  federalTD1: any;
  provincialTD1: any;
  ytdEarnings?: any;
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

    const { payRunId, employeeIds } = await req.json();

    if (!payRunId || !employeeIds?.length) {
      return new Response(
        JSON.stringify({ error: 'Missing payRunId or employeeIds' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log(`Calculating payroll for pay run: ${payRunId}, employees: ${employeeIds.length}`);

    // Get pay run details
    const { data: payRun, error: payRunError } = await supabase
      .from('pay_runs')
      .select('*')
      .eq('id', payRunId)
      .single();

    if (payRunError) {
      throw payRunError;
    }

    // Get current tax rules
    const currentYear = new Date().getFullYear();
    const { data: taxRules } = await supabase
      .from('tax_rules')
      .select('*')
      .eq('tax_year', currentYear)
      .eq('is_active', true);

    const { data: cppEiRules } = await supabase
      .from('cpp_ei_rules')
      .select('*')
      .eq('tax_year', currentYear)
      .eq('is_active', true)
      .single();

    // Calculate payroll for each employee
    const payLines = [];
    let totalGrossPay = 0;
    let totalNetPay = 0;
    let totalDeductions = 0;
    let totalTaxes = 0;

    for (const employeeId of employeeIds) {
      // Get employee details
      const { data: employee } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (!employee) continue;

      // Get employee rates
      const { data: rates } = await supabase
        .from('employee_rates')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('rate_type', 'hourly')
        .order('effective_from', { ascending: false })
        .limit(1);

      const hourlyRate = rates?.[0]?.base_rate || 25.0; // Default rate

      // Get timesheet data for this pay period (mock for now)
      const regularHours = 80; // 2-week period
      const overtimeHours = 5;
      
      // Calculate gross pay
      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * 1.5;
      const grossPay = regularPay + overtimePay;

      // Calculate Canadian payroll deductions
      const payrollCalc = calculateCanadianPayroll({
        employeeId,
        grossPay,
        payPeriodType: 'biweekly',
        province: employee.province_code,
        taxYear: currentYear,
        cppExempt: employee.cpp_exempt || false,
        eiExempt: employee.ei_exempt || false,
        federalTD1: employee.td1_federal || {},
        provincialTD1: employee.td1_provincial || {}
      }, taxRules || [], cppEiRules);

      const payLine = {
        pay_run_id: payRunId,
        employee_id: employeeId,
        gross_pay: grossPay,
        taxable_income: payrollCalc.taxableIncome,
        earnings: {
          regular: regularPay,
          overtime: overtimePay
        },
        deductions: payrollCalc.deductions,
        taxes: {
          federal: payrollCalc.deductions.federalTax,
          provincial: payrollCalc.deductions.provincialTax
        },
        employer_costs: payrollCalc.employerCosts,
        net_pay: payrollCalc.netPay,
        ytd_totals: payrollCalc.ytdTotals
      };

      payLines.push(payLine);
      
      totalGrossPay += grossPay;
      totalNetPay += payrollCalc.netPay;
      totalDeductions += payrollCalc.deductions.totalDeductions;
      totalTaxes += payrollCalc.deductions.totalTax;
    }

    // Insert pay lines
    const { error: insertError } = await supabase
      .from('pay_run_lines')
      .insert(payLines);

    if (insertError) {
      throw insertError;
    }

    // Update pay run totals
    const { error: updateError } = await supabase
      .from('pay_runs')
      .update({
        status: 'calculated',
        total_gross_pay: totalGrossPay,
        total_net_pay: totalNetPay,
        total_deductions: totalDeductions,
        total_taxes: totalTaxes,
        employee_count: employeeIds.length
      })
      .eq('id', payRunId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        payRunId,
        totalGrossPay,
        totalNetPay,
        employeeCount: employeeIds.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Payroll calculation error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});

// Canadian Payroll Calculation Function
function calculateCanadianPayroll(
  input: PayrollCalculationInput,
  taxRules: any[],
  cppEiRules: any
) {
  const { grossPay, payPeriodType, province, cppExempt, eiExempt } = input;
  
  // Pay period factors for annualization
  const payPeriodFactors = {
    weekly: 52,
    biweekly: 26,
    monthly: 12,
    annual: 1
  };

  const payPeriodFactor = payPeriodFactors[payPeriodType];
  const annualGross = grossPay * payPeriodFactor;

  // Default CPP/EI rules for 2025
  const defaultCppEi = cppEiRules || {
    cpp_basic_exemption: 3500,
    cpp_max_pensionable: 71300,
    cpp_rate_employee: 0.0595,
    cpp_rate_employer: 0.0595,
    ei_max_insurable: 68500,
    ei_rate_employee: 0.0229,
    ei_rate_employer: 0.03206
  };

  // Calculate CPP
  const cppDeduction = cppExempt ? 0 : calculateCPP(annualGross, defaultCppEi, payPeriodFactor);

  // Calculate EI  
  const eiDeduction = eiExempt ? 0 : calculateEI(annualGross, defaultCppEi, payPeriodFactor);

  // Calculate taxable income
  const taxableIncome = grossPay - cppDeduction - eiDeduction;
  const annualTaxableIncome = taxableIncome * payPeriodFactor;

  // Calculate federal tax
  const federalTaxRules = taxRules?.find(rule => rule.jurisdiction === 'federal');
  const federalTax = calculateTax(annualTaxableIncome, federalTaxRules, payPeriodFactor);

  // Calculate provincial tax
  const provincialTaxRules = taxRules?.find(rule => rule.jurisdiction === province);
  const provincialTax = calculateTax(annualTaxableIncome, provincialTaxRules, payPeriodFactor);

  const totalTax = federalTax + provincialTax;
  const totalDeductions = cppDeduction + eiDeduction + totalTax;
  const netPay = grossPay - totalDeductions;

  // Calculate employer costs
  const employerCppContribution = cppExempt ? 0 : calculateCPP(annualGross, defaultCppEi, payPeriodFactor);
  const employerEiContribution = eiExempt ? 0 : calculateEI(annualGross, defaultCppEi, payPeriodFactor) * 1.4;

  return {
    grossPay,
    taxableIncome,
    deductions: {
      cpp: cppDeduction,
      ei: eiDeduction,
      federalTax,
      provincialTax,
      totalTax,
      totalDeductions
    },
    employerCosts: {
      cpp: employerCppContribution,
      ei: employerEiContribution
    },
    netPay,
    ytdTotals: {
      gross: grossPay,
      cpp: cppDeduction,
      ei: eiDeduction,
      federalTax,
      provincialTax,
      netPay
    }
  };
}

function calculateCPP(annualGross: number, rules: any, payPeriodFactor: number): number {
  const cppPensionableEarnings = Math.min(
    Math.max(0, annualGross - rules.cpp_basic_exemption),
    rules.cpp_max_pensionable - rules.cpp_basic_exemption
  );
  
  const annualCpp = cppPensionableEarnings * rules.cpp_rate_employee;
  return annualCpp / payPeriodFactor;
}

function calculateEI(annualGross: number, rules: any, payPeriodFactor: number): number {
  const eiInsurableEarnings = Math.min(annualGross, rules.ei_max_insurable);
  const annualEi = eiInsurableEarnings * rules.ei_rate_employee;
  return annualEi / payPeriodFactor;
}

function calculateTax(annualTaxableIncome: number, taxRule: any, payPeriodFactor: number): number {
  if (!taxRule || !taxRule.brackets) return 0;

  const basicExemption = taxRule.basic_exemption || 0;
  const taxableAmount = Math.max(0, annualTaxableIncome - basicExemption);
  
  let tax = 0;
  const brackets = Array.isArray(taxRule.brackets) ? taxRule.brackets : JSON.parse(taxRule.brackets);
  
  for (const bracket of brackets) {
    if (taxableAmount <= bracket.min) break;
    
    const taxableInBracket = Math.min(
      taxableAmount - bracket.min,
      (bracket.max || Infinity) - bracket.min
    );
    
    tax += taxableInBracket * bracket.rate;
  }
  
  return tax / payPeriodFactor;
}