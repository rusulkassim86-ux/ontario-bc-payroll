import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PayCode {
  id: string;
  company_id: string;
  code: string;
  name: string;
  category: 'earning' | 'overtime' | 'pto' | 'premium' | 'bank' | 'deduction' | 'benefit';
  description?: string;
  taxable_flags: {
    federal: boolean;
    cpp: boolean;
    ei: boolean;
  };
  rate_type: 'multiplier' | 'flat_hourly' | 'flat_amount';
  multiplier?: number;
  default_hourly_rate_source?: 'employee' | 'policy';
  requires_hours: boolean;
  requires_amount: boolean;
  gl_earnings_code?: string;
  province?: string;
  union_code?: string;
  worksite_id?: string;
  effective_from: string;
  effective_to?: string;
  active: boolean;
  stackable: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAllowedPayCode {
  id: string;
  employee_id: string;
  pay_code_id: string;
  effective_from: string;
  effective_to?: string;
  active: boolean;
  pay_code: PayCode;
}

export function usePayCodes() {
  const [payCodes, setPayCodes] = useState<PayCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPayCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pay_codes')
        .select('*')
        .eq('active', true)
        .order('category', { ascending: true })
        .order('code', { ascending: true });

      if (error) throw error;
      setPayCodes((data || []).map(item => ({
        ...item,
        taxable_flags: item.taxable_flags as { federal: boolean; cpp: boolean; ei: boolean; }
      })) as PayCode[]);
    } catch (err) {
      console.error('Error fetching pay codes:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createPayCode = async (payCodeData: Omit<PayCode, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('pay_codes')
        .insert(payCodeData)
        .select()
        .single();

      if (error) throw error;

      await fetchPayCodes();
      toast({
        title: "Success",
        description: "Pay code created successfully",
      });

      return data;
    } catch (err) {
      console.error('Error creating pay code:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create pay code',
        variant: "destructive"
      });
      throw err;
    }
  };

  const updatePayCode = async (id: string, updates: Partial<PayCode>) => {
    try {
      const { error } = await supabase
        .from('pay_codes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchPayCodes();
      toast({
        title: "Success",
        description: "Pay code updated successfully",
      });
    } catch (err) {
      console.error('Error updating pay code:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to update pay code',
        variant: "destructive"
      });
      throw err;
    }
  };

  const deletePayCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pay_codes')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;

      await fetchPayCodes();
      toast({
        title: "Success",
        description: "Pay code deactivated successfully",
      });
    } catch (err) {
      console.error('Error deactivating pay code:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to deactivate pay code',
        variant: "destructive"
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchPayCodes();
  }, []);

  return {
    payCodes,
    loading,
    error,
    createPayCode,
    updatePayCode,
    deletePayCode,
    refreshData: fetchPayCodes
  };
}

export function useEmployeePayCodes(employeeIdentifier: string) {
  const [allowedPayCodes, setAllowedPayCodes] = useState<PayCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployeePayCodes = async () => {
    if (!employeeIdentifier) return;

    try {
      setLoading(true);
      
      // First get employee details for worksite/union matching
      let { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, worksite_id, union_id, province_code')
        .eq('employee_number', employeeIdentifier)
        .maybeSingle();

      // If not found by employee_number, try by UUID
      if (!employee && !empError) {
        const result = await supabase
          .from('employees')
          .select('id, worksite_id, union_id, province_code')
          .eq('id', employeeIdentifier)
          .maybeSingle();
        
        employee = result.data;
        empError = result.error;
      }

      if (empError) throw empError;

      if (empError || !employee) {
        setAllowedPayCodes([]);
        return;
      }

      // Get explicitly allowed pay codes
      const { data: explicitCodes, error: explicitError } = await supabase
        .from('employee_allowed_paycodes')
        .select(`
          pay_code:pay_codes (*)
        `)
        .eq('employee_id', employee.id)
        .eq('active', true)
        .lte('effective_from', new Date().toISOString())
        .or(`effective_to.is.null,effective_to.gte.${new Date().toISOString()}`);

      if (explicitError) throw explicitError;

      // Get general pay codes (no specific worksite/union restrictions)
      const { data: generalCodes, error: generalError } = await supabase
        .from('pay_codes')
        .select('*')
        .eq('active', true)
        .is('worksite_id', null)
        .is('union_code', null)
        .lte('effective_from', new Date().toISOString())
        .or(`effective_to.is.null,effective_to.gte.${new Date().toISOString()}`);

      if (generalError) throw generalError;

      // Get worksite/union specific codes if applicable
      let specificCodes: PayCode[] = [];
      if (employee.worksite_id || employee.union_id) {
        const { data, error } = await supabase
          .from('pay_codes')
          .select('*')
          .eq('active', true)
          .or(
            `worksite_id.eq.${employee.worksite_id || 'null'},union_code.eq.${employee.union_id || 'null'},province.eq.${employee.province_code}`
          )
          .lte('effective_from', new Date().toISOString())
          .or(`effective_to.is.null,effective_to.gte.${new Date().toISOString()}`);

        if (!error) specificCodes = (data || []).map(item => ({
          ...item,
          taxable_flags: item.taxable_flags as { federal: boolean; cpp: boolean; ei: boolean; }
        })) as PayCode[];
      }

      // Combine all available codes
      const explicitPayCodes = explicitCodes?.map(item => item.pay_code).filter(Boolean) || [];
      const allCodes = [...explicitPayCodes, ...generalCodes, ...specificCodes];
      
      // Remove duplicates
      const uniqueCodes = allCodes.filter((code, index, self) => 
        self.findIndex(c => c.id === code.id) === index
      );

      setAllowedPayCodes(uniqueCodes as PayCode[]);
    } catch (err) {
      console.error('Error fetching employee pay codes:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeePayCodes();
  }, [employeeIdentifier]);

  return {
    allowedPayCodes,
    loading,
    error,
    refreshData: fetchEmployeePayCodes
  };
}