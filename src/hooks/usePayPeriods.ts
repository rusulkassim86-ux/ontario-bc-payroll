import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export interface PayPeriod {
  id: string;
  company_id: string;
  worksite_id: string | null;
  union_code: string | null;
  frequency: 'biweekly' | 'weekly' | 'semi-monthly' | 'monthly';
  anchor_date: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export function usePayPeriods() {
  const { profile } = useAuth();
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayPeriods = async () => {
    if (!profile?.company_id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('company_pay_periods')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayPeriods((data || []) as PayPeriod[]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pay periods');
      console.error('Error fetching pay periods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.company_id) {
      fetchPayPeriods();
    }
  }, [profile?.company_id]);

  const createPayPeriod = async (payPeriod: {
    worksite_id: string | null;
    union_code: string | null;
    frequency: 'biweekly' | 'weekly' | 'semi-monthly' | 'monthly';
    anchor_date: string;
    timezone: string;
  }) => {
    if (!profile?.company_id) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('company_pay_periods')
      .insert({
        ...payPeriod,
        company_id: profile.company_id,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchPayPeriods();
    return data;
  };

  const updatePayPeriod = async (id: string, updates: Partial<PayPeriod>) => {
    const { data, error } = await supabase
      .from('company_pay_periods')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchPayPeriods();
    return data;
  };

  const deletePayPeriod = async (id: string) => {
    const { error } = await supabase
      .from('company_pay_periods')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchPayPeriods();
  };

  return {
    payPeriods,
    loading,
    error,
    createPayPeriod,
    updatePayPeriod,
    deletePayPeriod,
    refreshData: fetchPayPeriods,
  };
}

export function useEmployeePayPeriod(employeeId: string) {
  const { profile } = useAuth();
  const [payPeriod, setPayPeriod] = useState<PayPeriod | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployeePayPeriod = async () => {
      if (!profile?.company_id || !employeeId) return;

      try {
        setLoading(true);

        // First get employee details to find worksite/union
        const { data: employee } = await supabase
          .from('employees')
          .select('worksite_id, union_id')
          .eq('id', employeeId)
          .single();

        // Find applicable pay period policy
        const { data: periods } = await supabase
          .from('company_pay_periods')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('worksite_id', { ascending: false, nullsFirst: false })
          .order('union_code', { ascending: false, nullsFirst: false });

        if (periods && periods.length > 0) {
          // Find most specific match (worksite + union > worksite > union > default)
          const specificPeriod = periods.find(p => 
            p.worksite_id === employee?.worksite_id && p.union_code === employee?.union_id
          ) || periods.find(p => 
            p.worksite_id === employee?.worksite_id && !p.union_code
          ) || periods.find(p => 
            !p.worksite_id && p.union_code === employee?.union_id
          ) || periods.find(p => 
            !p.worksite_id && !p.union_code
          );

          setPayPeriod((specificPeriod || periods[0]) as PayPeriod);
        }
      } catch (err) {
        console.error('Error fetching employee pay period:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeePayPeriod();
  }, [profile?.company_id, employeeId]);

  return { payPeriod, loading };
}