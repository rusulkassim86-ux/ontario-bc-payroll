import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  province_code: string;
  employee_group: string | null;
  status: string;
}

export function useEmployeesByCompanyCode(companyCode: string | null) {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.company_id && companyCode) {
      fetchEmployees();
    } else {
      setEmployees([]);
      setLoading(false);
    }
  }, [profile?.company_id, companyCode]);

  const fetchEmployees = async () => {
    if (!profile?.company_id || !companyCode) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch employees filtered by company code (employee_group)
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('id, employee_number, first_name, last_name, email, province_code, employee_group, status')
        .eq('company_id', profile.company_id)
        .eq('employee_group', getGroupName(companyCode))
        .eq('status', 'active')
        .order('employee_number');

      if (fetchError) throw fetchError;
      setEmployees(data || []);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch employees');
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGroupName = (code: string): string => {
    const groupMap: Record<string, string> = {
      'OZC': 'Kitsault',
      '72R': '72R',
      '72S': '72S',
    };
    return groupMap[code] || code;
  };

  return {
    employees,
    loading,
    error,
    refreshEmployees: fetchEmployees,
  };
}
