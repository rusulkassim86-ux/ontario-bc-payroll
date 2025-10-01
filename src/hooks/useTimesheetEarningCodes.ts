import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TimesheetEarningCode {
  id: string;
  code: string;
  label: string;
  description: string;
  is_overtime: boolean;
  overtime_multiplier: number;
  active: boolean;
  allow_in_timesheets: boolean;
}

/**
 * Hook to fetch earning codes filtered by company code and timesheet availability
 * Only returns active codes that are mapped to the specified company
 */
export function useTimesheetEarningCodes(companyCode?: string) {
  const [earningCodes, setEarningCodes] = useState<TimesheetEarningCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEarningCodes();
  }, [companyCode]);

  const fetchEarningCodes = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!companyCode) {
        setEarningCodes([]);
        setLoading(false);
        return;
      }

      // Query earning codes that are:
      // 1. Active
      // 2. Allowed in timesheets
      // 3. Mapped to the company code via pay_code_company_map
      const { data, error: fetchError } = await supabase
        .from('earning_codes')
        .select(`
          id,
          code,
          label,
          description,
          is_overtime,
          overtime_multiplier,
          active,
          allow_in_timesheets,
          pay_code_company_map!inner(
            company_code,
            is_active
          )
        `)
        .eq('active', true)
        .eq('allow_in_timesheets', true)
        .eq('pay_code_company_map.company_code', companyCode)
        .eq('pay_code_company_map.is_active', true)
        .order('code');

      if (fetchError) throw fetchError;

      // Map the data to remove the nested structure
      const mappedData = (data || []).map(item => ({
        id: item.id,
        code: item.code,
        label: item.label || item.description,
        description: item.description,
        is_overtime: item.is_overtime,
        overtime_multiplier: item.overtime_multiplier,
        active: item.active,
        allow_in_timesheets: item.allow_in_timesheets
      }));

      setEarningCodes(mappedData);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch earning codes');
      console.error('Error fetching timesheet earning codes:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    earningCodes,
    loading,
    error,
    refreshEarningCodes: fetchEarningCodes,
  };
}
