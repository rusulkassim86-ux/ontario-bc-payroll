import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CRASubmission {
  id: string;
  company_id: string;
  submission_type: string;
  tax_year: number;
  employee_count: number;
  file_url?: string;
  xml_url?: string;
  pdf_url?: string;
  csv_url?: string;
  status: string;
  confirmation_number?: string;
  cra_reference_number?: string;
  details_json: any;
  errors_json: any;
  transmitted_at?: string;
  confirmed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RemittancePeriod {
  id: string;
  company_id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  due_date: string;
  total_income_tax: number;
  total_cpp_employee: number;
  total_cpp_employer: number;
  total_ei_employee: number;
  total_ei_employer: number;
  total_remittance: number;
  status: string;
  paid_date?: string;
  filed_date?: string;
  pd7a_url?: string;
  eft_file_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PaycodeCRAMapping {
  id: string;
  company_id: string;
  company_code: string;
  pay_code: string;
  deduction_code?: string;
  cra_box: string;
  box_description: string;
  mapping_type: string;
  is_cpp_pensionable: boolean;
  is_ei_insurable: boolean;
  is_taxable_federal: boolean;
  is_taxable_provincial: boolean;
  is_vacation_eligible: boolean;
  flags_json: any;
  gl_account?: string;
  cost_center?: string;
  department_code?: string;
  version: number;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeYearEndSummary {
  id: string;
  employee_id: string;
  tax_year: number;
  total_employment_income: number;
  total_cpp_pensionable: number;
  total_ei_insurable: number;
  total_cpp_contributions: number;
  total_ei_premiums: number;
  total_income_tax: number;
  total_rpp_contributions: number;
  total_union_dues: number;
  other_income: any;
  other_deductions: any;
  is_finalized: boolean;
  finalized_at?: string;
  created_at: string;
  updated_at: string;
  employee?: {
    employee_number: string;
    first_name: string;
    last_name: string;
    sin_encrypted?: string;
    province_code: string;
  };
}

export function useCRAIntegration() {
  const [submissions, setSubmissions] = useState<CRASubmission[]>([]);
  const [remittancePeriods, setRemittancePeriods] = useState<RemittancePeriod[]>([]);
  const [paycodeMappings, setPaycodeMappings] = useState<PaycodeCRAMapping[]>([]);
  const [yearEndSummaries, setYearEndSummaries] = useState<EmployeeYearEndSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch CRA submissions
  const fetchSubmissions = async (taxYear?: number) => {
    try {
      setLoading(true);
      let query = supabase
        .from('cra_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (taxYear) {
        query = query.eq('tax_year', taxYear);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch CRA submissions",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch remittance periods
  const fetchRemittancePeriods = async (year?: number) => {
    try {
      setLoading(true);
      let query = supabase
        .from('cra_remittance_reports')
        .select('*')
        .order('report_period_start', { ascending: false });

      if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        query = query.gte('report_period_start', startDate).lte('report_period_end', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Map to RemittancePeriod interface
      const mapped = (data || []).map(d => ({
        id: d.id,
        company_id: d.company_id,
        period_type: d.report_type,
        period_start: d.report_period_start,
        period_end: d.report_period_end,
        due_date: d.due_date,
        total_income_tax: d.total_federal_tax + d.total_provincial_tax,
        total_cpp_employee: d.total_cpp_employee,
        total_cpp_employer: d.total_cpp_employer,
        total_ei_employee: d.total_ei_employee,
        total_ei_employer: d.total_ei_employer,
        total_remittance: d.total_remittance_due,
        status: d.status,
        paid_date: d.status === 'paid' ? d.updated_at : undefined,
        filed_date: d.status === 'filed' ? d.updated_at : undefined,
        created_at: d.created_at,
        updated_at: d.updated_at,
      }));
      
      setRemittancePeriods(mapped);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch remittance periods",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch paycode CRA mappings
  const fetchPaycodeMappings = async (companyCode?: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from('paycode_cra_mapping')
        .select('*')
        .eq('is_active', true)
        .order('company_code', { ascending: true })
        .order('pay_code', { ascending: true });

      if (companyCode) {
        query = query.eq('company_code', companyCode);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPaycodeMappings(data || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch paycode mappings",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch employee year-end summaries
  const fetchYearEndSummaries = async (taxYear: number) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employee_year_end_summary')
        .select(`
          *,
          employee:employee_id (
            employee_number,
            first_name,
            last_name,
            sin_encrypted,
            province_code
          )
        `)
        .eq('tax_year', taxYear)
        .order('total_employment_income', { ascending: false });

      if (error) throw error;
      setYearEndSummaries(data || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch year-end summaries",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate and create remittance period
  const calculateRemittanceTotals = async (periodStart: string, periodEnd: string, periodType: 'monthly' | 'quarterly' = 'monthly') => {
    try {
      setLoading(true);
      
      // Get current user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile?.company_id) throw new Error('Company not found');

      // Call the edge function to calculate and create the period
      const { data, error } = await supabase.rpc('generate_cra_remittance_report', {
        p_company_id: profile.company_id,
        p_period_start: periodStart,
        p_period_end: periodEnd,
        p_report_type: periodType
      });

      if (error) throw error;
      
      toast({
        title: "Period Calculated",
        description: `Remittance period created successfully`,
      });
      
      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to calculate remittance totals",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Generate T4 slips for year
  const generateT4Slips = async (taxYear: number, employeeIds?: string[]) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('generate-t4-slips-year', {
        body: {
          taxYear,
          employeeIds
        }
      });

      if (error) throw error;

      toast({
        title: "T4 Slips Generated",
        description: `Generated T4 slips for ${data.employee_count} employees`,
      });

      await fetchSubmissions(taxYear);
      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate T4 slips",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Generate PD7A remittance report
  const generatePD7AReport = async (periodId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('generate-pd7a-report', {
        body: { periodId }
      });

      if (error) throw error;

      toast({
        title: "PD7A Report Generated",
        description: "Remittance report generated successfully",
      });

      await fetchRemittancePeriods();
      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate PD7A report",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Transmit to CRA
  const transmitToCRA = async (submissionId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('transmit-to-cra', {
        body: { submissionId }
      });

      if (error) throw error;

      toast({
        title: "Transmitted to CRA",
        description: `Confirmation number: ${data.confirmation_number}`,
      });

      await fetchSubmissions();
      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to transmit to CRA",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Build year-end summaries for all employees
  const buildYearEndSummaries = async (taxYear: number) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('build-year-end-summaries', {
        body: { taxYear }
      });

      if (error) throw error;

      toast({
        title: "Year-End Summaries Built",
        description: `Built summaries for ${data.employee_count} employees`,
      });

      await fetchYearEndSummaries(taxYear);
      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to build year-end summaries",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Upload paycode mapping file
  const uploadPaycodeMappingFile = async (file: File, companyCode: string) => {
    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('company_code', companyCode);

      const { data, error } = await supabase.functions.invoke('upload-paycode-mapping', {
        body: formData
      });

      if (error) throw error;

      toast({
        title: "Mapping Uploaded",
        description: `Imported ${data.imported_count} paycode mappings`,
      });

      await fetchPaycodeMappings(companyCode);
      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload paycode mapping",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Validate year-end readiness
  const validateYearEndReadiness = async (taxYear: number) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('validate-year-end-readiness', {
        body: { taxYear }
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to validate year-end readiness",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    fetchSubmissions();
    fetchRemittancePeriods(currentYear);
    fetchPaycodeMappings();
  }, []);

  return {
    // State
    submissions,
    remittancePeriods,
    paycodeMappings,
    yearEndSummaries,
    loading,
    error,
    
    // Actions
    fetchSubmissions,
    fetchRemittancePeriods,
    fetchPaycodeMappings,
    fetchYearEndSummaries,
    calculateRemittanceTotals,
    generateT4Slips,
    generatePD7AReport,
    transmitToCRA,
    buildYearEndSummaries,
    uploadPaycodeMappingFile,
    validateYearEndReadiness,
  };
}