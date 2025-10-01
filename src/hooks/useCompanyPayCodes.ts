import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyPayCode {
  id: string;
  code: string;
  label: string;
  description: string;
  is_overtime: boolean;
  overtime_multiplier: number;
  active: boolean;
}

/**
 * Hook to fetch pay codes filtered by company code
 * Only returns active earning codes that are mapped to the company
 * and allowed in timesheets
 */
export function useCompanyPayCodes(companyCode?: string) {
  const [payCodes, setPayCodes] = useState<CompanyPayCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyCode) {
      setPayCodes([]);
      setLoading(false);
      return;
    }

    fetchPayCodes();
  }, [companyCode]);

  const fetchPayCodes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch earning codes that are:
      // 1. Active
      // 2. Allowed in timesheets
      // 3. Mapped to the company via pay_code_company_map
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

      setPayCodes((data || []) as CompanyPayCode[]);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch pay codes');
      console.error('Error fetching company pay codes:', err);
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
