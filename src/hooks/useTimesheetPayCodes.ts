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

// Hardcoded fallback pay codes per company
const FALLBACK_PAY_CODES: Record<string, TimesheetPayCode[]> = {
  OZC: [
    { code: 'REG', description: 'Regular Hours', type: 'Earnings', is_active: true, company_scope: 'OZC', allow_in_timesheets: true },
    { code: 'OT', description: 'Overtime', type: 'Overtime', is_active: true, company_scope: 'OZC', allow_in_timesheets: true },
    { code: 'OT1', description: 'Overtime 1.5x', type: 'Overtime', is_active: true, company_scope: 'OZC', allow_in_timesheets: true },
    { code: 'OT2', description: 'Overtime 2x', type: 'Overtime', is_active: true, company_scope: 'OZC', allow_in_timesheets: true },
    { code: 'SICK', description: 'Sick Leave', type: 'Leave', is_active: true, company_scope: 'OZC', allow_in_timesheets: true },
    { code: 'VAC', description: 'Vacation', type: 'Leave', is_active: true, company_scope: 'OZC', allow_in_timesheets: true },
    { code: 'BONUS', description: 'Bonus', type: 'Earnings', is_active: true, company_scope: 'OZC', allow_in_timesheets: true },
  ],
  '72R': [
    { code: 'REG', description: 'Regular Hours', type: 'Earnings', is_active: true, company_scope: '72R', allow_in_timesheets: true },
    { code: 'OT', description: 'Overtime', type: 'Overtime', is_active: true, company_scope: '72R', allow_in_timesheets: true },
    { code: 'SICK', description: 'Sick Leave', type: 'Leave', is_active: true, company_scope: '72R', allow_in_timesheets: true },
  ],
  '72S': [
    { code: 'REG', description: 'Regular Hours', type: 'Earnings', is_active: true, company_scope: '72S', allow_in_timesheets: true },
    { code: 'OT', description: 'Overtime', type: 'Overtime', is_active: true, company_scope: '72S', allow_in_timesheets: true },
    { code: 'SICK', description: 'Sick Leave', type: 'Leave', is_active: true, company_scope: '72S', allow_in_timesheets: true },
  ],
};

const getCacheKey = (companyCode: string) => `paycodes:${companyCode}`;

const getFromCache = (companyCode: string): TimesheetPayCode[] | null => {
  try {
    const cached = localStorage.getItem(getCacheKey(companyCode));
    if (cached) {
      const { codes, timestamp } = JSON.parse(cached);
      // Cache valid for 1 hour
      if (Date.now() - timestamp < 3600000) {
        console.info('[PayCodes] Loaded from cache:', companyCode);
        return codes;
      }
    }
  } catch (err) {
    console.error('[PayCodes] Cache read error:', err);
  }
  return null;
};

const saveToCache = (companyCode: string, codes: TimesheetPayCode[]) => {
  try {
    localStorage.setItem(getCacheKey(companyCode), JSON.stringify({
      codes,
      timestamp: Date.now()
    }));
    console.info('[PayCodes] Saved to cache:', companyCode, codes.length);
  } catch (err) {
    console.error('[PayCodes] Cache write error:', err);
  }
};

const getFallback = (companyCode: string): TimesheetPayCode[] => {
  return FALLBACK_PAY_CODES[companyCode] || FALLBACK_PAY_CODES['OZC'];
};

/**
 * Hook to fetch available pay codes for timesheet entry
 * Features: HTTP fetch with 1500ms timeout, localStorage cache, hardcoded fallback
 */
export function useTimesheetPayCodes(companyCode?: string) {
  const { profile } = useAuth();
  const [payCodes, setPayCodes] = useState<TimesheetPayCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'http' | 'cache' | 'fallback'>('http');

  useEffect(() => {
    fetchPayCodes();
  }, [profile?.company_id, companyCode]);

  const fetchPayCodes = async () => {
    const company = companyCode || profile?.company_id || '';
    
    try {
      setLoading(true);
      setError(null);

      // Try cache first
      const cached = getFromCache(company);
      if (cached && cached.length > 0) {
        setPayCodes(cached);
        setSource('cache');
        setLoading(false);
        // Still fetch in background to refresh
        fetchFromHTTP(company, true);
        return;
      }

      // Fetch from HTTP
      await fetchFromHTTP(company, false);

    } catch (err: any) {
      console.error('[PayCodes] Fatal error, using fallback:', err);
      const fallback = getFallback(company);
      setPayCodes(fallback);
      setSource('fallback');
      setError(err.message || 'Using fallback codes');
    } finally {
      setLoading(false);
    }
  };

  const fetchFromHTTP = async (company: string, isBackground: boolean) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const query = supabase
        .from('pay_codes_master')
        .select('code, description, type, is_active, company_scope, allow_in_timesheets')
        .eq('is_active', true)
        .eq('allow_in_timesheets', true)
        .in('type', ['Earnings', 'Overtime', 'Leave'])
        .order('code')
        .abortSignal(controller.signal);

      if (company) {
        query.or(`company_scope.eq.${company},company_scope.eq.ALL`);
      }

      const { data, error: fetchError } = await query;
      clearTimeout(timeoutId);

      if (fetchError) throw fetchError;

      const codes = (data || []) as TimesheetPayCode[];
      
      if (codes.length > 0) {
        setPayCodes(codes);
        setSource('http');
        saveToCache(company, codes);
        console.info('[PayCodes] HTTP success:', company, codes.length);
      } else if (!isBackground) {
        // No codes from HTTP, use fallback
        throw new Error('No pay codes returned');
      }

    } catch (err: any) {
      if (!isBackground) {
        console.error('[PayCodes] HTTP failed, using fallback:', err.message);
        const fallback = getFallback(company);
        setPayCodes(fallback);
        setSource('fallback');
        setError('HTTP timeout/error - using fallback');
      }
    }
  };

  return {
    payCodes,
    loading,
    error,
    source,
    refreshPayCodes: fetchPayCodes,
  };
}
