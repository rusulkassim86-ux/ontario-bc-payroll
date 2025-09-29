import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Employee, EmployeeAdditionalEarning, EmployeeCustomField, T4Summary, ExportOptions } from "@/types/employee";
import { useToast } from "@/hooks/use-toast";

// Enhanced useEmployees hook with ADP-style functionality
export function useEmployeeProfile(employeeId: string) {
  const { toast } = useToast();

  // Fetch single employee with all related data
  const { data: employee, isLoading, error, refetch } = useQuery({
    queryKey: ['employee-profile', employeeId],
    queryFn: async () => {
      if (!employeeId) throw new Error('Employee ID required');
      
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          manager:employees!reports_to_id(
            id,
            first_name,
            last_name,
            employee_number
          )
        `)
        .eq('id', employeeId)
        .maybeSingle();

      if (error) throw error;
      return data as any as Employee;
    },
    enabled: !!employeeId,
  });

  // Fetch additional earnings
  const { data: additionalEarnings = [] } = useQuery({
    queryKey: ['additional-earnings', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('employee_additional_earnings')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmployeeAdditionalEarning[];
    },
    enabled: !!employeeId,
  });

  // Fetch custom fields
  const { data: customFields = [] } = useQuery({
    queryKey: ['custom-fields', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('employee_custom_fields')
        .select('*')
        .eq('employee_id', employeeId)
        .order('field_name');

      if (error) throw error;
      return data as EmployeeCustomField[];
    },
    enabled: !!employeeId,
  });

  // Fetch employee rates
  const { data: rates = [] } = useQuery({
    queryKey: ['employee-rates', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('employee_rates')
        .select('*')
        .eq('employee_id', employeeId)
        .order('effective_from', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  // Fetch pay history
  const { data: payHistory = [] } = useQuery({
    queryKey: ['pay-history', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from('pay_run_lines')
        .select(`
          *,
          pay_run:pay_runs(
            pay_calendar:pay_calendars(
              period_start,
              period_end
            )
          )
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  // Fetch year-end summary
  const { data: yearEndSummary } = useQuery({
    queryKey: ['year-end-summary', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('employee_year_end_summary')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('tax_year', currentYear)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  // Update employee function
  const updateEmployee = async (updates: Partial<Employee>) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', employeeId);

      if (error) throw error;

      toast({
        title: "Employee Updated",
        description: "Employee information has been updated successfully.",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Add additional earning
  const addAdditionalEarning = async (earning: Omit<EmployeeAdditionalEarning, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('employee_additional_earnings')
        .insert({ ...earning, employee_id: employeeId });

      if (error) throw error;

      toast({
        title: "Earning Added",
        description: "Additional earning has been added successfully.",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Add Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Add custom field
  const addCustomField = async (field: Omit<EmployeeCustomField, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('employee_custom_fields')
        .insert({ ...field, employee_id: employeeId });

      if (error) throw error;

      toast({
        title: "Field Added",
        description: "Custom field has been added successfully.",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Add Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Export employee data
  const exportEmployeeData = async (format: 'pdf' | 'excel') => {
    try {
      // This would be implemented with actual export functionality
      console.log(`Exporting employee ${employeeId} to ${format}`);
      
      toast({
        title: "Export Started",
        description: `Employee data is being exported to ${format.toUpperCase()}.`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Generate T4 summary
  const generateT4Summary = (): T4Summary | null => {
    if (!yearEndSummary) return null;

    return {
      box14_employment_income: yearEndSummary.total_employment_income,
      box16_cpp_contributions: yearEndSummary.total_cpp_contributions,
      box18_ei_premiums: yearEndSummary.total_ei_premiums,
      box22_income_tax: yearEndSummary.total_income_tax,
      box24_ei_insurable_earnings: yearEndSummary.total_ei_insurable,
      box26_cpp_pensionable_earnings: yearEndSummary.total_cpp_pensionable,
      box44_union_dues: yearEndSummary.total_union_dues,
    };
  };

  return {
    employee,
    additionalEarnings,
    customFields,
    rates,
    payHistory,
    yearEndSummary,
    t4Summary: generateT4Summary(),
    isLoading,
    error,
    updateEmployee,
    addAdditionalEarning,
    addCustomField,
    exportEmployeeData,
    refetch,
  };
}