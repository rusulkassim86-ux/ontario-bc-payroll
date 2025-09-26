import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PayCodeMaster {
  id: string;
  code: string;
  description: string;
  type: 'Earnings' | 'Deduction' | 'Overtime' | 'Benefit' | 'Leave' | 'Other';
  company_scope: string;
  is_active: boolean;
  effective_from?: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
}

export interface PayCodeGLMap {
  id: string;
  code: string;
  gl_account: string;
  mapping_segment?: string;
  company_scope: string;
  effective_from?: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
}

export function usePayCodesMaster() {
  const [payCodes, setPayCodes] = useState<PayCodeMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPayCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pay_codes_master')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;
      setPayCodes((data || []) as PayCodeMaster[]);
    } catch (err) {
      console.error('Error fetching pay codes master:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const createPayCode = async (payCodeData: Omit<PayCodeMaster, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('pay_codes_master')
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

  const updatePayCode = async (id: string, updates: Partial<PayCodeMaster>) => {
    try {
      const { error } = await supabase
        .from('pay_codes_master')
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

  const deactivatePayCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pay_codes_master')
        .update({ is_active: false })
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

  // Type derivation logic based on requirements
  const deriveType = (code: string, description: string): PayCodeMaster['type'] => {
    const codeUpper = code.toUpperCase();
    const descUpper = description.toUpperCase();

    // Overtime codes
    if (descUpper.includes('OVERTIME') || 
        ['E06', 'E09', 'E11', 'E29', 'E34', 'E08'].includes(codeUpper)) {
      return 'Overtime';
    }

    // Leave codes
    if (descUpper.includes('VAC') || descUpper.includes('VACATION') ||
        descUpper.includes('SICK') ||
        descUpper.includes('STAT') || descUpper.includes('HOL') ||
        descUpper.includes('BEREAV') ||
        descUpper.includes('FLOAT')) {
      return 'Leave';
    }

    // Earnings codes
    if (descUpper.includes('BONUS') ||
        codeUpper.includes('AVC') || codeUpper.includes('MSC')) {
      return 'Earnings';
    }

    // Default to Earnings for unknown patterns
    return 'Earnings';
  };

  // Bulk import function for ADP payroll items
  const importPayrollItems = async (items: Array<{
    payrollItem: string;
    code: string;
    companyScope: string;
    description: string;
  }>) => {
    try {
      const payCodesData = items.map(item => ({
        code: item.code,
        description: item.description,
        type: item.payrollItem === 'Deductions' ? 'Deduction' as const : 
              deriveType(item.code, item.description),
        company_scope: item.companyScope,
        is_active: true
      }));

      // Upsert by code
      const { error } = await supabase
        .from('pay_codes_master')
        .upsert(payCodesData, { 
          onConflict: 'code',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      await fetchPayCodes();
      toast({
        title: "Success",
        description: `Imported ${items.length} pay codes successfully`,
      });

      return payCodesData.length;
    } catch (err) {
      console.error('Error importing pay codes:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to import pay codes',
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
    deactivatePayCode,
    importPayrollItems,
    deriveType,
    refreshData: fetchPayCodes
  };
}