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
  union_id: string | null;
  classification: string | null;
  step: number | null;
  hire_date: string;
  termination_date: string | null;
  status: string;
}

export interface Company {
  id: string;
  name: string;
  legal_name: string;
  cra_business_number: string;
  remitter_type: string;
  default_pay_frequency: string;
  address: any;
  settings: any;
}

export interface PayCalendar {
  id: string;
  frequency: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: string;
}

export function usePayrollData() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [payCalendars, setPayCalendars] = useState<PayCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchPayrollData();
    }
  }, [profile?.company_id]);

  const fetchPayrollData = async () => {
    if (!profile?.company_id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (companyError) throw companyError;
      setCompany(companyData);

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('employee_number');

      if (employeesError) throw employeesError;
      setEmployees(employeesData || []);

      // Fetch pay calendars
      const { data: calendarData, error: calendarError } = await supabase
        .from('pay_calendars')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('period_start', { ascending: false });

      if (calendarError) throw calendarError;
      setPayCalendars(calendarData || []);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch payroll data');
      console.error('Error fetching payroll data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    fetchPayrollData();
  };

  return {
    employees,
    company,
    payCalendars,
    loading,
    error,
    refreshData,
  };
}