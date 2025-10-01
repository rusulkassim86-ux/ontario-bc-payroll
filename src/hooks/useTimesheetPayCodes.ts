import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export interface TimesheetPayCode {
  code: string;
  description: string;
  type: 'Earnings' | 'Overtime' | 'Leave' | 'Deduction' | 'Benefit' | 'Other';
  is_active: boolean;
  company_scope: string;
  allow_in_timesheets: boolean;
}

/**
 * Hook to fetch available pay codes for timesheet entry
 * Filters by active status and relevant types (Earnings, Overtime, Leave)
 */
export function useTimesheetPayCodes(companyCode?: string) {
  const { profile } = useAuth();
  const [payCodes, setPayCodes] = useState<TimesheetPayCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayCodes();
  }, [profile?.company_id, companyCode]);

  const fetchPayCodes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch active pay codes for timesheet entry
      let query = supabase
        .from('pay_codes_master')
        .select('code, description, type, is_active, company_scope, allow_in_timesheets')
        .eq('is_active', true)
        .eq('allow_in_timesheets', true)
        .in('type', ['Earnings', 'Overtime', 'Leave'])
        .order('code');

      // Filter by company scope if provided
      if (companyCode) {
        query = query.or(`company_scope.eq.${companyCode},company_scope.eq.ALL`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setPayCodes((data || []) as TimesheetPayCode[]);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch pay codes');
      console.error('Error fetching timesheet pay codes:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    payCodes,
    loading,
    error,
    refreshPayCodes: fetchPayCodes,
  };
}
