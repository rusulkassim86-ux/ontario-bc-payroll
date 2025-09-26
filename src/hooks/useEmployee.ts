import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  hire_date: string;
  termination_date?: string;
  status: string;
  province_code: string;
  classification?: string;
  worksite_id: string;
  union_id?: string;
  cba_id?: string;
  step?: number;
  company_id: string;
  address: any;
  td1_federal: any;
  td1_provincial: any;
  cpp_exempt: boolean;
  ei_exempt: boolean;
  sin_encrypted?: string;
  banking_info_encrypted?: string;
  created_at: string;
  updated_at: string;
}

export function useEmployee(employeeIdentifier: string) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEmployee = async () => {
    if (!employeeIdentifier) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First try to get by employee_number (which is what the URL params contain)
      let { data, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_number', employeeIdentifier)
        .maybeSingle();

      // If not found by employee_number, try by UUID (in case of direct UUID access)
      if (!data && !fetchError) {
        const result = await supabase
          .from('employees')
          .select('*')
          .eq('id', employeeIdentifier)
          .maybeSingle();
        
        data = result.data;
        fetchError = result.error;
      }

      if (fetchError) {
        console.error('Error fetching employee:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (!data) {
        setError('Employee not found');
        return;
      }

      setEmployee(data as Employee);
    } catch (err) {
      console.error('Error in fetchEmployee:', err);
      setError('Failed to fetch employee data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, [employeeIdentifier]);

  return {
    employee,
    loading,
    error,
    refetch: fetchEmployee
  };
}