import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PayrollCycleStatus {
  id: string;
  pay_cycle_id: string;
  company_code: string;
  status: 'pending' | 'in_progress' | 'processed' | 'posted';
  total_employees: number;
  processed_employees: number;
  total_hours: number;
  total_gross: number;
  total_net: number;
  locked_at: string | null;
  processed_at: string | null;
  posted_to_gl_at: string | null;
  error_log: any[];
  metadata: any;
  created_at: string;
  updated_at: string;
}

export function usePayrollCycleStatus(companyCode: string | null) {
  return useQuery<PayrollCycleStatus[]>({
    queryKey: ['payroll-cycle-status', companyCode],
    queryFn: async (): Promise<PayrollCycleStatus[]> => {
      if (!companyCode) return [];

      const { data, error } = await supabase
        .from('payroll_cycle_status')
        .select(`
          *,
          pay_cycles (
            week_number,
            period_start,
            period_end,
            pay_date
          )
        `)
        .eq('company_code', companyCode)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any;
    },
    enabled: !!companyCode,
  });
}

export function useProcessPayrollCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ payCycleId, companyCode }: { payCycleId: string; companyCode: string }) => {
      const { data, error } = await supabase.functions.invoke('process-payroll-cycle', {
        body: { payCycleId, companyCode }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-cycle-status'] });
      queryClient.invalidateQueries({ queryKey: ['pay-runs'] });
      toast.success(`Payroll processed: ${data.summary.processedEmployees} employees, $${data.summary.totalGross.toFixed(2)} gross`);
    },
    onError: (error: any) => {
      toast.error(`Failed to process payroll: ${error.message}`);
    },
  });
}