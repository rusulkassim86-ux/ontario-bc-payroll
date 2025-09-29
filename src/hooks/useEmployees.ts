import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Employee, EmployeeAdditionalEarning, EmployeeCustomField } from '@/types/employee';

export interface VacationPolicy {
  id: string;
  name: string;
  accrual_rate_pct: number;
  carryover_rules: Record<string, any>;
  company_id: string;
}

export interface EmployeeContact {
  id: string;
  employee_id: string;
  type: 'primary' | 'secondary';
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  doc_type: 'TD1_Federal' | 'TD1_Provincial' | 'Work_Permit' | 'Offer_Letter' | 'Policy_Ack' | 'ID';
  storage_path: string;
  original_filename: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  uploaded_at: string;
  downloaded_count: number;
}

// Employee interface now imported from types/employee.ts

export interface NewHireFormData {
  // Step 1: Basic Info
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  employee_number: string;
  hire_date: string;
  worksite_id: string;
  fte_hours_per_week: number;
  reports_to_id?: string;
  
  // Step 2: Payroll & GL
  province_code: string;
  classification?: string;
  union_id?: string;
  step?: number;
  gl_cost_center?: string;
  overtime_eligible: boolean;
  ot_multiplier: number;
  vacation_policy_id?: string;
  seniority_date?: string;
  
  // Step 3: IDs & Compliance
  sin?: string;
  work_eligibility: 'Citizen' | 'PR' | 'WorkPermit' | 'Other';
  permit_expiry?: string;
  td1_federal_status: 'Pending' | 'Received';
  td1_provincial_status: 'Pending' | 'Received';
  probation_end?: string;
  address: {
    street: string;
    city: string;
    province: string;
    postal_code: string;
  };
  
  // Step 4: Banking (Optional)
  banking_info?: {
    account_number: string;
    routing_number: string;
    bank_name: string;
  };
  
  // Step 5: Emergency & Documents
  primary_contact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  secondary_contact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  documents?: File[];
}

export function useEmployees() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees
  const useEmployeesList = () => {
    return useQuery({
      queryKey: ['employees'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('employees')
          .select(`
            *,
            reports_to:employees!employees_reports_to_id_fkey(
              id,
              first_name,
              last_name,
              employee_number
            ),
            vacation_policy:vacation_policies(
              id,
              name,
              accrual_rate_pct
            )
          `)
          .order('employee_number');

        if (error) throw error;
        return data as any as Employee[];
      },
    });
  };

  // Fetch vacation policies
  const useVacationPolicies = () => {
    return useQuery({
      queryKey: ['vacation-policies'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('vacation_policies')
          .select('*')
          .order('name');

        if (error) throw error;
        return data as VacationPolicy[];
      },
    });
  };

  // Fetch managers for reports_to dropdown
  const useManagers = () => {
    return useQuery({
      queryKey: ['managers'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('employees')
          .select('id, first_name, last_name, employee_number')
          .eq('status', 'active')
          .order('first_name');

        if (error) throw error;
        return data;
      },
    });
  };

  // Create new employee
  const createEmployee = useMutation({
    mutationFn: async (formData: NewHireFormData) => {
      // Start transaction
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .insert({
          employee_number: formData.employee_number,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          hire_date: formData.hire_date,
          worksite_id: formData.worksite_id,
          company_id: 'default-company-id', // This should be retrieved from user context
          province_code: formData.province_code,
          classification: formData.classification,
          union_id: formData.union_id,
          step: formData.step,
          address: formData.address,
          sin_encrypted: formData.sin,
          banking_info_encrypted: formData.banking_info ? JSON.stringify(formData.banking_info) : null,
          td1_federal: {},
          td1_provincial: {},
          cpp_exempt: false,
          ei_exempt: false,
          status: 'active',
          
          // New fields
          fte_hours_per_week: formData.fte_hours_per_week,
          reports_to_id: formData.reports_to_id,
          gl_cost_center: formData.gl_cost_center,
          overtime_eligible: formData.overtime_eligible,
          ot_multiplier: formData.ot_multiplier,
          vacation_policy_id: formData.vacation_policy_id,
          seniority_date: formData.seniority_date || formData.hire_date,
          work_eligibility: formData.work_eligibility,
          permit_expiry: formData.permit_expiry,
          td1_federal_status: formData.td1_federal_status,
          td1_provincial_status: formData.td1_provincial_status,
          probation_end: formData.probation_end,
          company_code: '72R', // Default to 72R
        })
        .select()
        .single();

      if (employeeError) throw employeeError;

      // Insert emergency contacts
      const contacts = [];
      if (formData.primary_contact) {
        contacts.push({
          employee_id: employee.id,
          type: 'primary' as const,
          ...formData.primary_contact,
        });
      }
      if (formData.secondary_contact) {
        contacts.push({
          employee_id: employee.id,
          type: 'secondary' as const,
          ...formData.secondary_contact,
        });
      }

      if (contacts.length > 0) {
        const { error: contactsError } = await supabase
          .from('employee_contacts')
          .insert(contacts);

        if (contactsError) throw contactsError;
      }

      // Handle document uploads if any
      if (formData.documents && formData.documents.length > 0) {
        for (const file of formData.documents) {
          const fileName = `${employee.id}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('employee-documents')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Create document record
          const { error: docError } = await supabase
            .from('employee_documents')
            .insert({
              employee_id: employee.id,
              doc_type: 'ID', // Default type, should be determined by file name or user selection
              storage_path: fileName,
              original_filename: file.name,
              file_size: file.size,
              mime_type: file.type,
            });

          if (docError) throw docError;
        }
      }

      return employee;
    },
    onSuccess: (employee) => {
      toast({
        title: 'Employee Created',
        description: `${employee.first_name} ${employee.last_name} has been successfully added.`,
      });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Creation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update employee
  const updateEmployee = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Employee> }) => {
      const { data: employee, error } = await supabase
        .from('employees')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return employee;
    },
    onSuccess: () => {
      toast({
        title: 'Employee Updated',
        description: 'Employee information has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get employee document download URL
  const getDocumentDownloadUrl = async (documentId: string) => {
    const { data: document, error: docError } = await supabase
      .from('employee_documents')
      .select('storage_path, original_filename')
      .eq('id', documentId)
      .single();

    if (docError) throw docError;

    const { data, error: urlError } = await supabase.storage
      .from('employee-documents')
      .createSignedUrl(document.storage_path, 60); // 1 minute expiry

    if (urlError) throw urlError;

    // Log download
    await supabase
      .from('employee_documents')
      .update({
        downloaded_count: 1, // Will be incremented by trigger
        last_downloaded_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    return {
      url: data.signedUrl,
      filename: document.original_filename,
    };
  };

  return {
    useEmployeesList,
    useVacationPolicies,
    useManagers,
    createEmployee,
    updateEmployee,
    getDocumentDownloadUrl,
  };
}