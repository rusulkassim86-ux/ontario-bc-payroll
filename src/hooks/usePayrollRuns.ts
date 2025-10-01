import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export interface PayrollRunData {
  id: string;
  status: string;
  created_at: string;
  pay_calendar_id: string;
  company_id: string;
  employeeCount: number;
  grossPay: number;
  netPay: number;
  deductions: number;
}

export function usePayrollRuns(companyCode: string | null) {
  const { profile } = useAuth();
  const [payrollRuns, setPayrollRuns] = useState<PayrollRunData[]>([]);
  const [currentRun, setCurrentRun] = useState<PayrollRunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchPayrollRuns();
    }
  }, [profile?.company_id, companyCode]);

  const fetchPayrollRuns = async () => {
    if (!profile?.company_id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch pay runs
      const { data: runs, error: runsError } = await supabase
        .from('pay_runs')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (runsError) throw runsError;

      // Fetch pay lines for each run to calculate totals
      const enrichedRuns = await Promise.all(
        (runs || []).map(async (run) => {
          const { data: lines } = await supabase
            .from('pay_run_lines')
            .select('gross_pay, net_pay')
            .eq('pay_run_id', run.id);

          const grossPay = lines?.reduce((sum, line) => sum + (line.gross_pay || 0), 0) || 0;
          const netPay = lines?.reduce((sum, line) => sum + (line.net_pay || 0), 0) || 0;
          const deductions = grossPay - netPay;

          return {
            id: run.id,
            status: run.status,
            created_at: run.created_at,
            pay_calendar_id: run.pay_calendar_id,
            company_id: run.company_id,
            employeeCount: lines?.length || 0,
            grossPay,
            netPay,
            deductions,
          };
        })
      );

      setPayrollRuns(enrichedRuns);
      
      // Find current in-progress run
      const inProgress = enrichedRuns.find(run => run.status === 'draft' || run.status === 'in_progress');
      setCurrentRun(inProgress || null);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch payroll runs');
      console.error('Error fetching payroll runs:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    payrollRuns,
    currentRun,
    loading,
    error,
    refreshRuns: fetchPayrollRuns,
  };
}
