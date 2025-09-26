import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PayrollRunData {
  id: string;
  company_id: string;
  pay_calendar_id: string;
  run_type: string;
  status: string;
  processed_by?: string;
  processed_at?: string;
  total_gross_pay: number;
  total_net_pay: number;
  total_deductions: number;
  total_taxes: number;
  employee_count: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollLineData {
  id: string;
  pay_run_id: string;
  employee_id: string;
  gross_pay: number;
  net_pay: number;
  taxable_income: number;
  earnings: any;
  deductions: any;
  taxes: any;
  employer_costs: any;
  ytd_totals: any;
  created_at: string;
  updated_at: string;
}

export interface TaxRule {
  id: string;
  jurisdiction: string;
  tax_year: number;
  effective_start: string;
  effective_end?: string;
  basic_exemption: number;
  brackets: any;
  supplemental_rate?: number;
  is_active: boolean;
}

export interface CPPEIRule {
  id: string;
  tax_year: number;
  effective_start: string;
  effective_end?: string;
  cpp_basic_exemption: number;
  cpp_max_pensionable: number;
  cpp_rate_employee: number;
  cpp_rate_employer: number;
  ei_max_insurable: number;
  ei_rate_employee: number;
  ei_rate_employer: number;
  is_active: boolean;
}

export function usePayrollCalculation() {
  const [payRuns, setPayRuns] = useState<PayrollRunData[]>([]);
  const [currentPayRun, setCurrentPayRun] = useState<PayrollRunData | null>(null);
  const [payLines, setPayLines] = useState<PayrollLineData[]>([]);
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [cppEiRules, setCppEiRules] = useState<CPPEIRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPayRuns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pay_runs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayRuns((data || []) as any[]);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch pay runs",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPayRunLines = async (payRunId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pay_run_lines')
        .select(`
          *,
          employees:employee_id (
            employee_number,
            first_name,
            last_name,
            province_code
          )
        `)
        .eq('pay_run_id', payRunId);

      if (error) throw error;
      setPayLines((data || []) as any[]);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch pay run lines",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxRules = async (taxYear: number) => {
    try {
      const { data, error } = await supabase
        .from('tax_rules')
        .select('*')
        .eq('tax_year', taxYear)
        .eq('is_active', true);

      if (error) throw error;
      setTaxRules((data || []) as any[]);
    } catch (err: any) {
      console.error('Error fetching tax rules:', err);
    }
  };

  const fetchCPPEIRules = async (taxYear: number) => {
    try {
      const { data, error } = await supabase
        .from('cpp_ei_rules')
        .select('*')
        .eq('tax_year', taxYear)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setCppEiRules([data] as any[]);
    } catch (err: any) {
      console.error('Error fetching CPP/EI rules:', err);
    }
  };

  const createPayRun = async (payCalendarId: string, runType: string = 'regular') => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pay_runs')
        .insert({
          company_id: 'default-company', // This should come from context
          pay_calendar_id: payCalendarId,
          run_type: runType,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentPayRun(data as any);
      toast({
        title: "Pay Run Created",
        description: "New pay run created successfully",
      });
      
      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create pay run",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const calculatePayRun = async (payRunId: string, employeeIds: string[]) => {
    try {
      setLoading(true);
      
      // Call the edge function to calculate payroll
      const { data, error } = await supabase.functions.invoke('calculate-payroll', {
        body: {
          payRunId,
          employeeIds
        }
      });

      if (error) throw error;

      toast({
        title: "Payroll Calculated",
        description: `Calculated payroll for ${employeeIds.length} employees`,
      });

      // Refresh pay run data
      await fetchPayRunLines(payRunId);
      
      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to calculate payroll",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const approvePayRun = async (payRunId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pay_runs')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString()
        })
        .eq('id', payRunId)
        .select()
        .single();

      if (error) throw error;

      setCurrentPayRun(data as any);
      toast({
        title: "Pay Run Approved",
        description: "Pay run has been approved and is ready for processing",
      });

      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve pay run",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generatePayStubs = async (payRunId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('generate-pay-stubs', {
        body: { payRunId }
      });

      if (error) throw error;

      toast({
        title: "Pay Stubs Generated",
        description: "Pay stubs have been generated for all employees",
      });

      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate pay stubs",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayRuns();
    const currentYear = new Date().getFullYear();
    fetchTaxRules(currentYear);
    fetchCPPEIRules(currentYear);
  }, []);

  return {
    payRuns,
    currentPayRun,
    payLines,
    taxRules,
    cppEiRules,
    loading,
    error,
    fetchPayRuns,
    fetchPayRunLines,
    createPayRun,
    calculatePayRun,
    approvePayRun,
    generatePayStubs,
    setCurrentPayRun
  };
}