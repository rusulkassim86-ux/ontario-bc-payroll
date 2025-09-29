import { calculatePayroll } from '@/services/calculatePayroll';
import { PayrollInput, PayrollResult } from '@/payroll/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type PayrollPeriod = {
  start: string;
  end: string;
  frequency: PayrollInput['payFrequency'];
};

export type PayrollRunResult = PayrollResult & {
  employeeId: string;
  period: PayrollPeriod;
  runId?: string;
};

export async function runPayrollForEmployee(
  employeeId: string, 
  period: PayrollPeriod,
  grossPay?: number
): Promise<PayrollRunResult> {
  try {
    // Load employee data
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();
    
    if (employeeError || !employee) {
      throw new Error('Employee not found');
    }

    // Validate province support
    if (!employee.province_code || !['ON', 'BC'].includes(employee.province_code)) {
      throw new Error('Only Ontario (ON) and British Columbia (BC) are currently supported');
    }
    
    // Calculate gross pay from timesheets or salary if not provided
    let calculatedGrossPay = grossPay;
    
    if (!calculatedGrossPay) {
      // If salary-based, calculate based on frequency
      if (employee.annual_salary) {
        const payPeriodsPerYear = getPayPeriodsPerYear(period.frequency);
        calculatedGrossPay = employee.annual_salary / payPeriodsPerYear;
      } else if (employee.salary) {
        // Hourly rate * standard hours
        calculatedGrossPay = employee.salary * (employee.standard_hours || 40);
      } else {
        throw new Error('Unable to determine gross pay for employee');
      }
    }
    
    // Get YTD totals
    const { data: ytdData } = await supabase
      .from('employee_year_end_summary')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('tax_year', new Date().getFullYear())
      .maybeSingle();
    
    // Prepare payroll input using new 2025 structure
    const payrollInput: PayrollInput = {
      grossPay: calculatedGrossPay,
      province: employee.province_code as "ON" | "BC",
      payFrequency: period.frequency,
      ytd: ytdData ? {
        cpp: ytdData.total_cpp_contributions || 0,
        ei: ytdData.total_ei_premiums || 0,
        fedTax: (ytdData.total_income_tax || 0) * 0.7, // Estimate federal portion
        provTax: (ytdData.total_income_tax || 0) * 0.3, // Estimate provincial portion
      } : undefined,
    };
    
    // Calculate payroll using new 2025 rates
    const result = await calculatePayroll(payrollInput);
    
    return {
      ...result,
      employeeId,
      period
    };
    
  } catch (error) {
    console.error('Payroll calculation error:', error);
    toast({
      variant: "destructive",
      title: "Payroll Calculation Failed",
      description: error instanceof Error ? error.message : "Unknown error occurred",
    });
    throw error;
  }
}

export async function savePayrollRun(payrollResults: PayrollRunResult[]): Promise<string> {
  try {
    // Create pay run record
    const { data: payRun, error: payRunError } = await supabase
      .from('pay_runs')
      .insert({
        company_id: 'default-company', // This should come from context
        pay_calendar_id: 'default-calendar', // This should come from the period
        run_type: 'regular',
        status: 'calculated',
        total_gross_pay: payrollResults.reduce((sum, r) => sum + r.summary.gross, 0),
        total_net_pay: payrollResults.reduce((sum, r) => sum + r.netPay, 0),
        total_deductions: payrollResults.reduce((sum, r) => 
          sum + r.deductions.cpp + r.deductions.ei + r.deductions.fedTax + r.deductions.provTax, 0),
        total_taxes: payrollResults.reduce((sum, r) => 
          sum + r.deductions.fedTax + r.deductions.provTax, 0),
        employee_count: payrollResults.length
      })
      .select()
      .single();
    
    if (payRunError || !payRun) {
      throw new Error('Failed to create pay run');
    }
    
    // Create pay run lines
    const payLines = payrollResults.map(result => ({
      pay_run_id: payRun.id,
      employee_id: result.employeeId,
      gross_pay: result.summary.gross,
      net_pay: result.netPay,
      taxable_income: result.summary.taxableGross,
      earnings: { gross: result.summary.gross },
      deductions: result.deductions,
      taxes: {
        federal: result.deductions.fedTax,
        provincial: result.deductions.provTax
      },
      employer_costs: result.employerCosts,
      ytd_totals: {}
    }));
    
    const { error: linesError } = await supabase
      .from('pay_run_lines')
      .insert(payLines);
    
    if (linesError) {
      throw new Error('Failed to save pay run details');
    }
    
    // Log audit entry
    await supabase
      .from('audit_logs')
      .insert({
        entity_type: 'pay_run',
        entity_id: payRun.id,
        action: 'CREATE',
        metadata: {
          employee_count: payrollResults.length,
          total_gross: payRun.total_gross_pay
        }
      });
    
    toast({
      title: "Payroll Run Saved",
      description: `Successfully processed payroll for ${payrollResults.length} employees`,
    });
    
    return payRun.id;
    
  } catch (error) {
    console.error('Save payroll run error:', error);
    toast({
      variant: "destructive",
      title: "Save Failed",
      description: error instanceof Error ? error.message : "Failed to save payroll run",
    });
    throw error;
  }
}

function getPayPeriodsPerYear(frequency: PayrollInput['payFrequency']): number {
  switch (frequency) {
    case 'Weekly': return 52;
    case 'Biweekly': return 26;
    case 'SemiMonthly': return 24;
    case 'Monthly': return 12;
    default: return 26;
  }
}