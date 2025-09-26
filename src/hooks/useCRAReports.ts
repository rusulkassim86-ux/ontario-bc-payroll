import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CRARemittanceReport {
  id: string;
  company_id: string;
  report_period_start: string;
  report_period_end: string;
  report_type: 'monthly' | 'quarterly';
  total_cpp_employee: number;
  total_cpp_employer: number;
  total_ei_employee: number;
  total_ei_employer: number;
  total_federal_tax: number;
  total_provincial_tax: number;
  total_remittance_due: number;
  due_date: string;
  status: 'draft' | 'finalized' | 'submitted';
  generated_by: string;
  generated_at: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface T4Slip {
  id: string;
  company_id: string;
  employee_id: string;
  tax_year: number;
  box_14_employment_income: number;
  box_16_cpp_contributions: number;
  box_17_cpp_pensionable_earnings: number;
  box_18_ei_premiums: number;
  box_19_ei_insurable_earnings: number;
  box_22_income_tax_deducted: number;
  box_24_ei_insurable_earnings: number;
  box_26_cpp_pensionable_earnings: number;
  box_44_union_dues: number;
  box_46_charitable_donations: number;
  box_50_rpps: number;
  other_boxes: Record<string, any>;
  status: 'draft' | 'finalized' | 'issued' | 'amended';
  original_slip_id?: string;
  amendment_reason?: string;
  generated_by: string;
  generated_at: string;
  issued_at?: string;
  created_at: string;
  updated_at: string;
  employee?: {
    first_name: string;
    last_name: string;
    employee_number: string;
    sin_encrypted: string;
  };
}

export interface T4ASlip {
  id: string;
  company_id: string;
  recipient_name: string;
  recipient_sin?: string;
  recipient_address: Record<string, any>;
  tax_year: number;
  box_20_self_employed_commissions: number;
  box_22_income_tax_deducted: number;
  box_48_fees_services: number;
  other_boxes: Record<string, any>;
  status: 'draft' | 'finalized' | 'issued' | 'amended';
  original_slip_id?: string;
  amendment_reason?: string;
  generated_by: string;
  generated_at: string;
  issued_at?: string;
  created_at: string;
  updated_at: string;
}

export function useCRAReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch CRA remittance reports
  const useRemittanceReports = (year?: number) => {
    return useQuery({
      queryKey: ['cra-remittance-reports', year],
      queryFn: async () => {
        let query = supabase
          .from('cra_remittance_reports')
          .select('*')
          .order('report_period_start', { ascending: false });

        if (year) {
          query = query
            .gte('report_period_start', `${year}-01-01`)
            .lte('report_period_end', `${year}-12-31`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as CRARemittanceReport[];
      },
    });
  };

  // Generate remittance report
  const generateRemittanceReport = useMutation({
    mutationFn: async (params: {
      companyId: string;
      periodStart: string;
      periodEnd: string;
      reportType: 'monthly' | 'quarterly';
    }) => {
      const { data, error } = await supabase.rpc('generate_cra_remittance_report', {
        p_company_id: params.companyId,
        p_period_start: params.periodStart,
        p_period_end: params.periodEnd,
        p_report_type: params.reportType,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Report Generated',
        description: 'CRA remittance report has been generated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['cra-remittance-reports'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch T4 slips
  const useT4Slips = (taxYear?: number) => {
    return useQuery({
      queryKey: ['t4-slips', taxYear],
      queryFn: async () => {
        let query = supabase
          .from('t4_slips')
          .select(`
            *,
            employee:employees(
              first_name,
              last_name,
              employee_number,
              sin_encrypted
            )
          `)
          .order('created_at', { ascending: false });

        if (taxYear) {
          query = query.eq('tax_year', taxYear);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as any[]; // Type will be refined when proper foreign key is set up
      },
    });
  };

  // Generate T4 slips for all employees
  const generateT4Slips = useMutation({
    mutationFn: async (params: {
      companyId: string;
      taxYear: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-t4-slips', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'T4 Slips Generated',
        description: 'T4 slips have been generated for all eligible employees.',
      });
      queryClient.invalidateQueries({ queryKey: ['t4-slips'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch T4A slips
  const useT4ASlips = (taxYear?: number) => {
    return useQuery({
      queryKey: ['t4a-slips', taxYear],
      queryFn: async () => {
        let query = supabase
          .from('t4a_slips')
          .select('*')
          .order('created_at', { ascending: false });

        if (taxYear) {
          query = query.eq('tax_year', taxYear);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as T4ASlip[];
      },
    });
  };

  // Update slip status
  const updateSlipStatus = useMutation({
    mutationFn: async (params: {
      slipId: string;
      status: string;
      slipType: 't4' | 't4a';
    }) => {
      const table = params.slipType === 't4' ? 't4_slips' : 't4a_slips';
      const updateData: any = { status: params.status };
      
      if (params.status === 'issued') {
        updateData.issued_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', params.slipId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Status Updated',
        description: `${variables.slipType.toUpperCase()} slip status updated successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: [`${variables.slipType}-slips`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Export functions
  const exportReport = async (format: 'pdf' | 'excel' | 'csv' | 'xml', reportData: any, filename: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('export-cra-report', {
        body: {
          format,
          reportData,
          filename,
        },
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { 
        type: format === 'pdf' ? 'application/pdf' : 
              format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
              format === 'xml' ? 'application/xml' : 'text/csv'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: `Report exported as ${format.toUpperCase()} successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return {
    useRemittanceReports,
    generateRemittanceReport,
    useT4Slips,
    generateT4Slips,
    useT4ASlips,
    updateSlipStatus,
    exportReport,
  };
}