import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeDate, normalizeProvince, normalizeName } from '@/utils/adpValidation';

interface ImportData {
  data: Record<string, any>[];
  mapping: Record<string, string>;
  companyCode: string;
  isUnion: boolean;
  onProgress?: (progress: number) => void;
}

interface ImportResult {
  successful: number;
  failed: number;
  errors: Array<{ row: number; field: string; message: string; }>;
}

export function useEmployeeBulkImport() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);

  const processImport = async ({
    data,
    mapping,
    companyCode,
    isUnion,
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

      // Process in batches of 50
      const batchSize = 50;
      const totalBatches = Math.ceil(data.length / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, data.length);
        const batch = data.slice(startIndex, endIndex);

        const employeesToInsert = [];

        for (const row of batch) {
          try {
            // Transform row data according to mapping
            const employeeData: Record<string, any> = {
              company_id: profile.company_id,
              company_code: companyCode,
              status: 'active',
              overtime_eligible: true,
              ot_multiplier: 1.5,
              fte_hours_per_week: 40,
              td1_federal: {},
              td1_provincial: {},
              address: {},
              cpp_exempt: false,
              ei_exempt: false,
              td1_federal_status: 'Pending',
              td1_provincial_status: 'Pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            // Map fields from the row data
            Object.entries(mapping).forEach(([field, column]) => {
              if (column && row[column] !== undefined && row[column] !== '') {
                let value = row[column];

                // Apply field-specific transformations
                switch (field) {
                  case 'employee_number':
                  case 'email':
                  case 'phone':
                  case 'home_department':
                  case 'job_title':
                  case 'classification':
                  case 'gl_cost_center':
                  case 'business_unit':
                  case 'location':
                  case 'union_code':
                    employeeData[field] = String(value).trim();
                    break;

                  case 'first_name':
                  case 'last_name':
                    employeeData[field] = String(value).trim();
                    break;

                  case 'full_name':
                    // Split full name using enhanced normalization
                    if (!mapping.first_name || !mapping.last_name) {
                      const nameResult = normalizeName(value);
                      if (!mapping.first_name && nameResult.firstName) {
                        employeeData.first_name = nameResult.firstName;
                      }
                      if (!mapping.last_name && nameResult.lastName) {
                        employeeData.last_name = nameResult.lastName;
                      }
                    }
                    break;

                  case 'province_code':
                    const provinceResult = normalizeProvince(value);
                    employeeData[field] = provinceResult.normalized || String(value).trim().toUpperCase();
                    break;

                  case 'hire_date':
                  case 'birth_date':
                    if (value) {
                      const dateResult = normalizeDate(value);
                      if (dateResult.normalized) {
                        employeeData[field === 'birth_date' ? field : 'hire_date'] = dateResult.normalized;
                        if (field === 'hire_date') {
                          employeeData.seniority_date = dateResult.normalized; // Default seniority to hire date
                        }
                      }
                    }
                    break;

                  case 'sin':
                    if (value) {
                      employeeData.sin_encrypted = String(value).replace(/\D/g, '');
                    }
                    break;

                  case 'rate':
                    if (value) {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        // Determine if it's salary or hourly based on rate_type or amount
                        const rateType = mapping.rate_type ? row[mapping.rate_type] : null;
                        if (rateType && String(rateType).toLowerCase().includes('salary')) {
                          employeeData.annual_salary = numValue;
                        } else {
                          employeeData.salary = numValue; // Regular hourly rate
                        }
                      }
                    }
                    break;

                  case 'rate_type':
                    if (value) {
                      const rateTypeValue = String(value).toLowerCase();
                      if (rateTypeValue.includes('salary') || rateTypeValue.includes('salaried')) {
                        employeeData.pay_frequency = employeeData.pay_frequency || 'biweekly';
                      }
                    }
                    break;

                  case 'standard_hours':
                  case 'fte':
                    if (value) {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        if (field === 'standard_hours') {
                          employeeData.fte_hours_per_week = numValue;
                        } else {
                          employeeData.fte = numValue;
                        }
                      }
                    }
                    break;

                  case 'status':
                    if (value) {
                      const statusMap: Record<string, string> = {
                        'active': 'active',
                        'terminated': 'terminated',
                        'leave': 'inactive',
                        'inactive': 'inactive'
                      };
                      const statusValue = String(value).toLowerCase();
                      employeeData.status = statusMap[statusValue] || 'active';
                    }
                    break;

                  case 'pay_frequency':
                    if (value) {
                      const freqMap: Record<string, string> = {
                        'weekly': 'weekly',
                        'biweekly': 'biweekly',
                        'bi-weekly': 'biweekly',
                        'semimonthly': 'semimonthly',
                        'semi-monthly': 'semimonthly',
                        'monthly': 'monthly'
                      };
                      const freqValue = String(value).toLowerCase().replace(/\s+/g, '');
                      employeeData.pay_frequency = freqMap[freqValue] || 'biweekly';
                    }
                    break;

                  case 'address_line1':
                  case 'address_line2':
                  case 'city':
                  case 'postal_code':
                    // Build address object
                    if (!employeeData.address) {
                      employeeData.address = {};
                    }
                    const addressField = field.replace('address_', '');
                    employeeData.address[addressField] = String(value).trim();
                    if (field === 'postal_code') {
                      // Format Canadian postal code
                      employeeData.address.postal_code = String(value).replace(/\s+/g, '').toUpperCase();
                    }
                    break;

                  case 'reports_to':
                    if (value) {
                      // Store in metadata for later resolution
                      if (!employeeData.metadata) {
                        employeeData.metadata = {};
                      }
                      employeeData.metadata.reports_to_name = String(value).trim();
                    }
                    break;

                  default:
                    // Handle any other fields generically
                    employeeData[field] = value;
                    break;
                }
              }
            });

            // Set default worksite (would need to be configurable)
            if (!employeeData.worksite_id) {
              // Get the first worksite for this company
              const { data: worksites } = await supabase
                .from('worksites')
                .select('id')
                .eq('company_id', profile.company_id)
                .limit(1);
              
              if (worksites && worksites.length > 0) {
                employeeData.worksite_id = worksites[0].id;
              }
            }

            employeesToInsert.push(employeeData);

          } catch (error) {
            errors.push({
              row: row._rowIndex || (startIndex + employeesToInsert.length + 1),
              field: 'general',
              message: error instanceof Error ? error.message : 'Unknown error'
            });
            failed++;
          }
        }

        // Insert batch
        if (employeesToInsert.length > 0) {
          const { data: insertedEmployees, error: insertError } = await supabase
            .from('employees')
            .insert(employeesToInsert)
            .select('id, employee_number, first_name, last_name');

          if (insertError) {
            // Handle constraint violations and other errors
            employeesToInsert.forEach((_, index) => {
              errors.push({
                row: startIndex + index + 2,
                field: 'database',
                message: insertError.message
              });
            });
            failed += employeesToInsert.length;
          } else {
            successful += insertedEmployees?.length || 0;

            // Create audit log entry
            try {
              await supabase.rpc('create_audit_log', {
                p_action: 'BULK_EMPLOYEE_IMPORT',
                p_entity_type: 'employee',
                p_entity_id: null,
                p_metadata: {
                  company_code: companyCode,
                  is_union: isUnion,
                  batch_size: employeesToInsert.length,
                  batch_index: batchIndex
                }
              });
            } catch (auditError) {
              console.warn('Failed to create audit log:', auditError);
            }
          }
        }

        // Update progress
        const progress = ((batchIndex + 1) / totalBatches) * 100;
        onProgress?.(progress);

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Show completion toast
      if (successful > 0) {
        toast({
          title: 'Import Complete',
          description: `Successfully imported ${successful} employees${failed > 0 ? `, ${failed} failed` : ''}`,
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