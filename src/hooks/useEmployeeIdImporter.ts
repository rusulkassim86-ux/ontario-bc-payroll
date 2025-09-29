import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Employee entity for ID-based import
export interface EmployeeIdEntity {
  employeeId: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  department?: string;
  province: 'ON' | 'BC' | 'AB' | 'SK' | 'MB' | 'QC' | 'NB' | 'NS' | 'PE' | 'NL' | 'YT' | 'NT' | 'NU';
  hireDate?: string;
  payType?: 'Salaried' | 'Hourly';
  salary?: number;
  hourlyRate?: number;
  standardHours?: number;
  union?: 'UNIFOR' | 'PSAC' | 'NonUnion' | null;
  group?: 'Kitsault' | null;
  deductionCodes?: string[];
}

// Field mappings for Employee ID import
export const EMPLOYEE_ID_FIELDS = {
  employeeId: { label: 'Employee ID', required: true, type: 'text' },
  firstName: { label: 'First Name', required: false, type: 'text' },
  lastName: { label: 'Last Name', required: false, type: 'text' },
  jobTitle: { label: 'Job Title', required: false, type: 'text' },
  department: { label: 'Department', required: false, type: 'text' },
  province: { 
    label: 'Province (default)', 
    required: true, 
    type: 'select', 
    options: ['ON', 'BC', 'AB', 'SK', 'MB', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU'] 
  },
  hireDate: { label: 'Hire Date', required: false, type: 'date' },
  payType: { label: 'Pay Type', required: false, type: 'select', options: ['Salaried', 'Hourly'] },
  salary: { label: 'Salary (Annual)', required: false, type: 'number' },
  hourlyRate: { label: 'Hourly Rate', required: false, type: 'number' },
  standardHours: { label: 'Standard Hours', required: false, type: 'number' },
  deductionCodes: { label: 'Deduction Codes (multi-value)', required: false, type: 'text' },
  unionOverride: { label: 'Union Override (for 72R)', required: false, type: 'select', options: ['PSAC', 'NonUnion'] },
  provinceOverride: { label: 'Province Override (for 72R)', required: false, type: 'select', options: ['BC'] }
};

// Auto-detect mapping for Employee ID import
export function autoDetectEmployeeIdMapping(headers: string[]): Record<string, string | null> {
  const mapping: Record<string, string | null> = {};
  
  Object.keys(EMPLOYEE_ID_FIELDS).forEach(field => {
    mapping[field] = null;
  });

  headers.forEach(header => {
    const lower = header.toLowerCase().trim();
    
    if (!mapping.employeeId && (lower.includes('employee') && lower.includes('id'))) {
      mapping.employeeId = header;
    } else if (!mapping.firstName && lower.includes('first') && lower.includes('name')) {
      mapping.firstName = header;
    } else if (!mapping.lastName && lower.includes('last') && lower.includes('name')) {
      mapping.lastName = header;
    } else if (!mapping.jobTitle && (lower.includes('job') && lower.includes('title'))) {
      mapping.jobTitle = header;
    } else if (!mapping.department && lower.includes('department')) {
      mapping.department = header;
    } else if (!mapping.province && lower.includes('province')) {
      mapping.province = header;
    } else if (!mapping.hireDate && lower.includes('hire') && lower.includes('date')) {
      mapping.hireDate = header;
    } else if (!mapping.payType && lower.includes('pay') && lower.includes('type')) {
      mapping.payType = header;
    } else if (!mapping.salary && lower.includes('salary')) {
      mapping.salary = header;
    } else if (!mapping.hourlyRate && lower.includes('hourly') && lower.includes('rate')) {
      mapping.hourlyRate = header;
    } else if (!mapping.standardHours && lower.includes('standard') && lower.includes('hours')) {
      mapping.standardHours = header;
    } else if (!mapping.deductionCodes && lower.includes('deduction') && lower.includes('codes')) {
      mapping.deductionCodes = header;
    } else if (!mapping.unionOverride && lower.includes('union') && lower.includes('override')) {
      mapping.unionOverride = header;
    } else if (!mapping.provinceOverride && lower.includes('province') && lower.includes('override')) {
      mapping.provinceOverride = header;
    }
  });

  return mapping;
}

// Deduction code processing logic
export interface DeductionProcessingResult {
  union: 'UNIFOR' | 'PSAC' | 'NonUnion' | null;
  group: 'Kitsault' | null;
  province: string;
  errors: string[];
}

export function processDeductionCodes(
  deductionCodes: string[],
  defaultProvince: string,
  unionOverride?: string,
  provinceOverride?: string
): DeductionProcessingResult {
  const result: DeductionProcessingResult = {
    union: null,
    group: null,
    province: defaultProvince,
    errors: []
  };

  const has72S = deductionCodes.includes('72S');
  const hasOZC = deductionCodes.includes('OZC');
  const has72R = deductionCodes.includes('72R');

  // Rule 1: 72S → union = UNIFOR
  if (has72S) {
    result.union = 'UNIFOR';
  }

  // Rule 2: OZC → group = Kitsault and force province = BC
  if (hasOZC) {
    result.group = 'Kitsault';
    result.province = 'BC';
  }

  // Rule 3: 72R → requires overrides
  if (has72R) {
    if (!unionOverride) {
      result.errors.push('72R code requires unionOverride (PSAC or NonUnion)');
    } else {
      if (unionOverride === 'PSAC' || unionOverride === 'NonUnion') {
        result.union = unionOverride;
      } else {
        result.errors.push('Invalid unionOverride value. Must be PSAC or NonUnion');
      }
    }

    // Province override for 72R (optional, defaults to ON if not provided)
    if (provinceOverride) {
      if (provinceOverride === 'BC') {
        result.province = 'BC';
      } else {
        result.errors.push('Invalid provinceOverride value. Must be BC');
      }
    } else {
      // Default for 72R without province override
      result.province = 'ON';
      result.union = result.union || 'NonUnion';
    }
  }

  return result;
}

interface ImportData {
  data: Record<string, any>[];
  mapping: Record<string, string>;
  onProgress?: (progress: number) => void;
}

interface ImportResult {
  successful: number;
  failed: number;
  errors: Array<{ row: number; field: string; message: string; }>;
}

export function useEmployeeIdImporter() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);

  const processImport = async ({
    data,
    mapping,
    onProgress
  }: ImportData): Promise<ImportResult> => {
    setIsImporting(true);
    const errors: Array<{ row: number; field: string; message: string; }> = [];
    let successful = 0;
    let failed = 0;

    try {
      // Get current user's company
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      if (profileError) throw profileError;

      // Process in batches
      const batchSize = 50;
      const totalBatches = Math.ceil(data.length / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, data.length);
        const batch = data.slice(startIndex, endIndex);

        const employeesToUpsert = [];

        for (const row of batch) {
          try {
            const employeeData: Record<string, any> = {
              company_id: profile.company_id,
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            // Basic field mapping
            Object.entries(mapping).forEach(([field, column]) => {
              if (column && row[column] !== undefined && row[column] !== '') {
                const value = row[column];

                switch (field) {
                  case 'employeeId':
                    employeeData.employee_number = String(value).trim();
                    break;
                  case 'firstName':
                    employeeData.first_name = String(value).trim();
                    break;
                  case 'lastName':
                    employeeData.last_name = String(value).trim();
                    break;
                  case 'jobTitle':
                    employeeData.job_title = String(value).trim();
                    break;
                  case 'department':
                    employeeData.home_department = String(value).trim();
                    break;
                  case 'province':
                    employeeData.province_code = String(value).trim().toUpperCase();
                    break;
                  case 'hireDate':
                    if (value) {
                      const date = new Date(value);
                      if (!isNaN(date.getTime())) {
                        employeeData.hire_date = date.toISOString().split('T')[0];
                      }
                    }
                    break;
                  case 'payType':
                    // Store in metadata for reference
                    if (!employeeData.metadata) employeeData.metadata = {};
                    employeeData.metadata.pay_type = String(value).trim();
                    break;
                  case 'salary':
                    if (value) {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        employeeData.annual_salary = numValue;
                      }
                    }
                    break;
                  case 'hourlyRate':
                    if (value) {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        employeeData.salary = numValue;
                      }
                    }
                    break;
                  case 'standardHours':
                    if (value) {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        employeeData.fte_hours_per_week = numValue;
                      }
                    }
                    break;
                }
              }
            });

            // Process deduction codes
            const deductionCodesRaw = mapping.deductionCodes ? row[mapping.deductionCodes] : '';
            const unionOverride = mapping.unionOverride ? row[mapping.unionOverride] : undefined;
            const provinceOverride = mapping.provinceOverride ? row[mapping.provinceOverride] : undefined;

            let deductionCodes: string[] = [];
            if (deductionCodesRaw) {
              // Parse deduction codes (comma-separated or space-separated)
              deductionCodes = String(deductionCodesRaw)
                .split(/[,\s]+/)
                .map(code => code.trim())
                .filter(code => code.length > 0);
            }

            // Apply deduction code business rules
            const deductionResult = processDeductionCodes(
              deductionCodes,
              employeeData.province_code || 'ON',
              unionOverride,
              provinceOverride
            );

            if (deductionResult.errors.length > 0) {
              deductionResult.errors.forEach(error => {
                errors.push({
                  row: row._rowIndex || (startIndex + employeesToUpsert.length + 1),
                  field: 'deductionCodes',
                  message: error
                });
              });
              failed++;
              continue;
            }

            // Apply resolved values
            employeeData.province_code = deductionResult.province;
            if (!employeeData.metadata) employeeData.metadata = {};
            employeeData.metadata.union = deductionResult.union;
            employeeData.metadata.group = deductionResult.group;
            employeeData.metadata.deduction_codes = deductionCodes;

            // Set default worksite
            const { data: worksites } = await supabase
              .from('worksites')
              .select('id')
              .eq('company_id', profile.company_id)
              .limit(1);
            
            if (worksites && worksites.length > 0) {
              employeeData.worksite_id = worksites[0].id;
            }

            employeesToUpsert.push(employeeData);

          } catch (error) {
            errors.push({
              row: row._rowIndex || (startIndex + employeesToUpsert.length + 1),
              field: 'general',
              message: error instanceof Error ? error.message : 'Unknown error'
            });
            failed++;
          }
        }

        // Upsert batch (insert or update based on employee_number)
        if (employeesToUpsert.length > 0) {
          const { data: upsertedEmployees, error: upsertError } = await supabase
            .from('employees')
            .upsert(employeesToUpsert, { 
              onConflict: 'employee_number,company_id',
              ignoreDuplicates: false 
            })
            .select('id, employee_number, first_name, last_name');

          if (upsertError) {
            employeesToUpsert.forEach((_, index) => {
              errors.push({
                row: startIndex + index + 2,
                field: 'database',
                message: upsertError.message
              });
            });
            failed += employeesToUpsert.length;
          } else {
            successful += upsertedEmployees?.length || 0;
          }
        }

        // Update progress
        const progress = ((batchIndex + 1) / totalBatches) * 100;
        onProgress?.(progress);
      }

      if (successful > 0) {
        toast({
          title: 'Import Complete',
          description: `Successfully processed ${successful} employees${failed > 0 ? `, ${failed} failed` : ''}`,
        });
      }

      return { successful, failed, errors };

    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      
      return {
        successful: 0,
        failed: data.length,
        errors: [{ row: 0, field: 'general', message: 'Import failed due to system error' }]
      };
    } finally {
      setIsImporting(false);
    }
  };

  return {
    processImport,
    isImporting
  };
}