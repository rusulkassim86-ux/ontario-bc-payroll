import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export interface TimesheetPayCode {
  id: string;
  code: string;
  label: string;
  description: string;
  is_overtime: boolean;
  overtime_multiplier: number;
  active: boolean;
}

// Hardcoded fallback pay codes per company
const FALLBACK_PAY_CODES: Record<string, TimesheetPayCode[]> = {
  OZC: [
    { id: 'ozc-reg', code: 'REG', label: 'Regular Hours', description: 'Regular Hours', is_overtime: false, overtime_multiplier: 1.0, active: true },
    { id: 'ozc-ot', code: 'O/T', label: 'Overtime', description: 'Overtime', is_overtime: true, overtime_multiplier: 1.5, active: true },
    { id: 'ozc-ot1', code: 'OT1', label: 'Overtime 1.5x', description: 'Overtime 1.5x', is_overtime: true, overtime_multiplier: 1.5, active: true },
    { id: 'ozc-ot2', code: 'OT2', label: 'Overtime 2x', description: 'Overtime 2x', is_overtime: true, overtime_multiplier: 2.0, active: true },
    { id: 'ozc-sick', code: 'SICK', label: 'Sick Leave', description: 'Sick Leave', is_overtime: false, overtime_multiplier: 1.0, active: true },
    { id: 'ozc-vac', code: 'VAC', label: 'Vacation', description: 'Vacation', is_overtime: false, overtime_multiplier: 1.0, active: true },
    { id: 'ozc-bonus', code: 'BONUS', label: 'Bonus', description: 'Bonus', is_overtime: false, overtime_multiplier: 1.0, active: true },
    { id: 'ozc-stat', code: 'STAT', label: 'Stat Holiday', description: 'Stat Holiday', is_overtime: false, overtime_multiplier: 1.0, active: true },
  ],
  '72R': [
    { id: '72r-reg', code: 'REG', label: 'Regular Hours', description: 'Regular Hours', is_overtime: false, overtime_multiplier: 1.0, active: true },
    { id: '72r-ot', code: 'O/T', label: 'Overtime', description: 'Overtime', is_overtime: true, overtime_multiplier: 1.5, active: true },
    { id: '72r-sick', code: 'SICK', label: 'Sick Leave', description: 'Sick Leave', is_overtime: false, overtime_multiplier: 1.0, active: true },
    { id: '72r-vac', code: 'VAC', label: 'Vacation', description: 'Vacation', is_overtime: false, overtime_multiplier: 1.0, active: true },
  ],
  '72S': [
    { id: '72s-reg', code: 'REG', label: 'Regular Hours', description: 'Regular Hours', is_overtime: false, overtime_multiplier: 1.0, active: true },
    { id: '72s-ot', code: 'O/T', label: 'Overtime', description: 'Overtime', is_overtime: true, overtime_multiplier: 1.5, active: true },
    { id: '72s-sick', code: 'SICK', label: 'Sick Leave', description: 'Sick Leave', is_overtime: false, overtime_multiplier: 1.0, active: true },
    { id: '72s-vac', code: 'VAC', label: 'Vacation', description: 'Vacation', is_overtime: false, overtime_multiplier: 1.0, active: true },
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

      // Query earning_codes table filtered by company and timesheet eligibility
      const { data, error: fetchError } = await supabase
        .from('earning_codes')
        .select('id, code, label, description, is_overtime, overtime_multiplier, active, allow_in_timesheets, company_id')
        .eq('active', true)
        .eq('allow_in_timesheets', true)
        .order('code')
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (fetchError) throw fetchError;

      // Filter by company_id if we have the full UUID
      let codes = (data || []) as any[];
      
      // If we have company code, try to find matching company_id
      // For now, return all codes since company_code != company_id
      const mappedCodes: TimesheetPayCode[] = codes.map(c => ({
        id: c.id,
        code: c.code,
        label: c.label || c.description,
        description: c.description,
        is_overtime: c.is_overtime || false,
        overtime_multiplier: c.overtime_multiplier || 1.0,
        active: c.active,
      }));
      
      if (mappedCodes.length > 0) {
        setPayCodes(mappedCodes);
        setSource('http');
        saveToCache(company, mappedCodes);
        console.info('[PayCodes] HTTP success:', company, mappedCodes.length);
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
