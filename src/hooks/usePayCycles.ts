import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PayCycle {
  id: string;
  company_code: string;
  week_number: number;
  in_date: string;
  out_date: string;
  pay_date: string;
  period_start: string;
  period_end: string;
  deduction_groups?: any;
  special_effects?: any;
  report_groups?: any;
  status: string;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export function usePayCycles(companyCode: string | null) {
  return useQuery<PayCycle[]>({
    queryKey: ['pay-cycles', companyCode],
    queryFn: async (): Promise<PayCycle[]> => {
      if (!companyCode) return [];

      const { data, error } = await supabase
        .from('pay_cycles')
        .select('*')
        .eq('company_code', companyCode)
        .order('period_start', { ascending: false });

      if (error) throw error;
      return (data || []) as any;
    },
    enabled: !!companyCode,
  });
}

export function useCurrentPayCycle(companyCode: string | null) {
  return useQuery<PayCycle | null>({
    queryKey: ['current-pay-cycle', companyCode],
    queryFn: async (): Promise<PayCycle | null> => {
      if (!companyCode) return null;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('pay_cycles')
        .select('*')
        .eq('company_code', companyCode)
        .eq('status', 'active')
        .lte('period_start', today)
        .gte('period_end', today)
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
    enabled: !!companyCode,
  });
}
