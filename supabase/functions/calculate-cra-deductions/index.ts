import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CRADeductionRequest {
  employeeId: string;
  grossPay: number;
  payPeriodsPerYear: number;
  province: string;
  taxYear?: number;
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

    const { employeeId, grossPay, payPeriodsPerYear, province, taxYear = new Date().getFullYear() }: CRADeductionRequest = await req.json();

    // Get employee details
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      throw new Error('Employee not found');
    }

    // Get CPP/EI rules for the tax year
    const { data: cppEiRules, error: cppEiError } = await supabase
      .from('cpp_ei_rules')
      .select('*')
      .eq('tax_year', taxYear)
      .eq('is_active', true)
      .single();

    if (cppEiError || !cppEiRules) {
      throw new Error('CPP/EI rules not found for tax year');
    }

    // Calculate annual gross for tax calculations
    const annualGross = grossPay * payPeriodsPerYear;

    // Calculate CPP deduction
    let cppDeduction = 0;
    if (!employee.cpp_exempt && grossPay > 0) {
      const cppPensionableEarnings = Math.max(0, annualGross - cppEiRules.cpp_basic_exemption);
      const maxCppContribution = (cppEiRules.cpp_max_pensionable - cppEiRules.cpp_basic_exemption) * cppEiRules.cpp_rate_employee;
      cppDeduction = Math.min(
        cppPensionableEarnings * cppEiRules.cpp_rate_employee / payPeriodsPerYear,
        maxCppContribution / payPeriodsPerYear
      );
    }

    // Calculate EI deduction
    let eiDeduction = 0;
    if (!employee.ei_exempt && grossPay > 0) {
      const maxEiContribution = cppEiRules.ei_max_insurable * cppEiRules.ei_rate_employee;
      eiDeduction = Math.min(
        grossPay * cppEiRules.ei_rate_employee,
        maxEiContribution / payPeriodsPerYear
      );
    }

    // Calculate federal tax using CRA tax tables
    const { data: federalTax, error: federalTaxError } = await supabase
      .rpc('calculate_cra_taxes', {
        gross_income: grossPay,
        pay_periods_per_year: payPeriodsPerYear,
        jurisdiction: 'federal',
        tax_year: taxYear
      });

    if (federalTaxError) {
      console.warn('Failed to calculate federal tax:', federalTaxError);
    }

    // Calculate provincial tax
    const { data: provincialTax, error: provincialTaxError } = await supabase
      .rpc('calculate_cra_taxes', {
        gross_income: grossPay,
        pay_periods_per_year: payPeriodsPerYear,
        jurisdiction: province.toLowerCase(),
        tax_year: taxYear
      });

    if (provincialTaxError) {
      console.warn('Failed to calculate provincial tax:', provincialTaxError);
    }

    const deductions = {
      cpp_employee: Math.round(cppDeduction * 100) / 100,
      cpp_employer: Math.round(cppDeduction * 100) / 100, // Employer matches employee
      ei_employee: Math.round(eiDeduction * 100) / 100,
      ei_employer: Math.round(eiDeduction * cppEiRules.ei_rate_employer / cppEiRules.ei_rate_employee * 100) / 100,
      federal_tax: Math.round((federalTax || 0) * 100) / 100,
      provincial_tax: Math.round((provincialTax || 0) * 100) / 100,
    };

    const totalDeductions = deductions.cpp_employee + deductions.ei_employee + deductions.federal_tax + deductions.provincial_tax;
    const netPay = grossPay - totalDeductions;

    const result = {
      employee_id: employeeId,
      gross_pay: grossPay,
      deductions,
      total_deductions: Math.round(totalDeductions * 100) / 100,
      net_pay: Math.round(netPay * 100) / 100,
      taxable_income: grossPay, // Simplified - would need to account for non-taxable benefits
      calculation_details: {
        tax_year: taxYear,
        pay_periods_per_year: payPeriodsPerYear,
        province: province,
        cpp_pensionable_earnings: Math.max(0, annualGross - cppEiRules.cpp_basic_exemption),
        ei_insurable_earnings: Math.min(annualGross, cppEiRules.ei_max_insurable),
        cpp_exempt: employee.cpp_exempt,
        ei_exempt: employee.ei_exempt
      }
    };

    return new Response(
      JSON.stringify({
        success: true,
        result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in calculate-cra-deductions function:', error);
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