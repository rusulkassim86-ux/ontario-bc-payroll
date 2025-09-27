import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CRATaxTable {
  id: string;
  jurisdiction: string;
  tax_year: number;
  pay_period_type: string;
  income_from: number;
  income_to: number;
  tax_amount: number;
  effective_start: string;
  effective_end?: string;
  is_active: boolean;
}

export interface T4BoxMapping {
  id: string;
  pay_code_id?: string;
  deduction_code_id?: string;
  t4_box: string;
  box_description: string;
  mapping_type: string;
  calculation_method: string;
  is_active: boolean;
  pay_codes?: {
    code: string;
    description: string;
  };
  deduction_codes?: {
    code: string;
    description: string;
  };
}

export interface ROESlip {
  id: string;
  company_id: string;
  employee_id: string;
  roe_number: string;
  serial_number?: string;
  payroll_reference_number?: string;
  first_day_worked: string;
  last_day_worked: string;
  final_pay_period_end: string;
  reason_for_issuing: string;
  insurable_hours: number;
  insurable_earnings: number;
  total_insurable_earnings: number;
  vacation_pay: number;
  statutory_holiday_pay: number;
  other_monies: any;
  pay_period_details: any;
  comments?: string;
  status: string;
  generated_at: string;
  submitted_at?: string;
  employees?: {
    employee_number: string;
    first_name: string;
    last_name: string;
  };
}

export interface CRAComplianceLog {
  id: string;
  company_id: string;
  compliance_type: string;
  entity_id: string;
  compliance_status: string;
  validation_errors: any;
  filed_at?: string;
  filed_by?: string;
  cra_confirmation?: string;
}

export function useCRACompliance() {
  const [taxTables, setTaxTables] = useState<CRATaxTable[]>([]);
  const [t4BoxMappings, setT4BoxMappings] = useState<T4BoxMapping[]>([]);
  const [roeSlips, setROESlips] = useState<ROESlip[]>([]);
  const [complianceLog, setComplianceLog] = useState<CRAComplianceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch CRA tax tables
  const fetchTaxTables = async (taxYear?: number) => {
    try {
      setLoading(true);
      let query = supabase
        .from('cra_tax_tables')
        .select('*')
        .eq('is_active', true)
        .order('jurisdiction', { ascending: true })
        .order('income_from', { ascending: true });

      if (taxYear) {
        query = query.eq('tax_year', taxYear);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTaxTables(data || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch CRA tax tables",
      });
    } finally {
      setLoading(false);
    }
  };

  // Upload CRA tax tables from Excel
  const uploadTaxTables = async (file: File, taxYear: number) => {
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tax_year', taxYear.toString());

      const { data, error } = await supabase.functions.invoke('upload-cra-tax-tables', {
        body: formData
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Uploaded ${data.imported_count} tax table entries`,
      });

      await fetchTaxTables(taxYear);
      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload tax tables",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch T4 box mappings
  const fetchT4BoxMappings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('t4_box_mappings')
        .select(`
          *,
          pay_codes:pay_code_id (code, description),
          deduction_codes:deduction_code_id (code, description)
        `)
        .eq('is_active', true)
        .order('t4_box', { ascending: true });

      if (error) throw error;
      setT4BoxMappings(data || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch T4 box mappings",
      });
    } finally {
      setLoading(false);
    }
  };

  // Upload T4 box mappings from CSV
  const uploadT4BoxMappings = async (file: File) => {
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('upload-t4-box-mappings', {
        body: formData
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Uploaded ${data.imported_count} T4 box mappings`,
      });

      await fetchT4BoxMappings();
      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload T4 box mappings",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch ROE slips
  const fetchROESlips = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('roe_slips')
        .select(`
          *,
          employees:employee_id (
            employee_number,
            first_name,
            last_name
          )
        `)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setROESlips(data || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch ROE slips",
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate ROE slip for terminated employee
  const generateROESlip = async (employeeId: string, terminationData: {
    lastDayWorked: string;
    reasonForIssuing: string;
    finalPayPeriodEnd: string;
    comments?: string;
  }) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('generate-roe-slip', {
        body: {
          employeeId,
          ...terminationData
        }
      });

      if (error) throw error;

      toast({
        title: "ROE Generated",
        description: `ROE slip ${data.roe_number} generated successfully`,
      });

      await fetchROESlips();
      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate ROE slip",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Calculate CRA deductions for payroll
  const calculateCRADeductions = async (payrollData: {
    employeeId: string;
    grossPay: number;
    payPeriodsPerYear: number;
    province: string;
    taxYear?: number;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('calculate-cra-deductions', {
        body: payrollData
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error calculating CRA deductions:', err);
      throw err;
    }
  };

  // Auto-generate T4 slips for year-end
  const generateYearEndT4Slips = async (taxYear: number) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('generate-year-end-t4s', {
        body: { taxYear }
      });

      if (error) throw error;

      toast({
        title: "T4 Slips Generated",
        description: `Generated T4 slips for ${data.employee_count} employees`,
      });

      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate year-end T4 slips",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch compliance log
  const fetchComplianceLog = async () => {
    try {
      const { data, error } = await supabase
        .from('cra_compliance_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplianceLog(data || []);
    } catch (err: any) {
      console.error('Error fetching compliance log:', err);
    }
  };

  useEffect(() => {
    fetchTaxTables();
    fetchT4BoxMappings();
    fetchROESlips();
    fetchComplianceLog();
  }, []);

  return {
    // State
    taxTables,
    t4BoxMappings,
    roeSlips,
    complianceLog,
    loading,
    error,
    
    // Actions
    fetchTaxTables,
    uploadTaxTables,
    fetchT4BoxMappings,
    uploadT4BoxMappings,
    fetchROESlips,
    generateROESlip,
    calculateCRADeductions,
    generateYearEndT4Slips,
    fetchComplianceLog,
  };
}