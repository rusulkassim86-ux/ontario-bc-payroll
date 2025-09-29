import { processDeductionCodes } from '@/hooks/useEmployeeIdImporter';

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateEmployeeIdData(
  data: Record<string, any>[],
  mapping: Record<string, string>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  data.forEach((row, index) => {
    const rowIndex = row._rowIndex || index + 2;

    // Validate required Employee ID
    const employeeIdColumn = mapping.employeeId;
    if (employeeIdColumn) {
      const employeeId = row[employeeIdColumn];
      if (!employeeId || String(employeeId).trim() === '') {
        errors.push({
          row: rowIndex,
          field: 'employeeId',
          value: employeeId,
          message: 'Employee ID is required'
        });
      }
    } else {
      errors.push({
        row: rowIndex,
        field: 'employeeId',
        value: null,
        message: 'Employee ID column not mapped'
      });
    }

    // Validate province if provided
    const provinceColumn = mapping.province;
    if (provinceColumn && row[provinceColumn]) {
      const province = String(row[provinceColumn]).trim().toUpperCase();
      const validProvinces = ['ON', 'BC', 'AB', 'SK', 'MB', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU'];
      if (!validProvinces.includes(province)) {
        errors.push({
          row: rowIndex,
          field: 'province',
          value: province,
          message: `Invalid province code. Must be one of: ${validProvinces.join(', ')}`
        });
      }
    }

    // Validate hire date if provided
    const hireDateColumn = mapping.hireDate;
    if (hireDateColumn && row[hireDateColumn]) {
      const hireDate = new Date(row[hireDateColumn]);
      if (isNaN(hireDate.getTime())) {
        errors.push({
          row: rowIndex,
          field: 'hireDate',
          value: row[hireDateColumn],
          message: 'Invalid hire date format'
        });
      }
    }

    // Validate pay type if provided
    const payTypeColumn = mapping.payType;
    if (payTypeColumn && row[payTypeColumn]) {
      const payType = String(row[payTypeColumn]).trim();
      if (!['Salaried', 'Hourly'].includes(payType)) {
        errors.push({
          row: rowIndex,
          field: 'payType',
          value: payType,
          message: 'Pay type must be either "Salaried" or "Hourly"'
        });
      }
    }

    // Validate salary/hourly rate consistency
    const salaryColumn = mapping.salary;
    const hourlyRateColumn = mapping.hourlyRate;
    if (payTypeColumn && row[payTypeColumn]) {
      const payType = String(row[payTypeColumn]).trim();
      if (payType === 'Salaried' && hourlyRateColumn && row[hourlyRateColumn]) {
        warnings.push({
          row: rowIndex,
          field: 'hourlyRate',
          value: row[hourlyRateColumn],
          message: 'Hourly rate provided for salaried employee (will be ignored)'
        });
      }
      if (payType === 'Hourly' && salaryColumn && row[salaryColumn]) {
        warnings.push({
          row: rowIndex,
          field: 'salary',
          value: row[salaryColumn],
          message: 'Salary provided for hourly employee (will be ignored)'
        });
      }
    }

    // Validate deduction codes and business rules
    const deductionCodesColumn = mapping.deductionCodes;
    const unionOverrideColumn = mapping.unionOverride;
    const provinceOverrideColumn = mapping.provinceOverride;

    if (deductionCodesColumn && row[deductionCodesColumn]) {
      const deductionCodesRaw = String(row[deductionCodesColumn]);
      const deductionCodes = deductionCodesRaw
        .split(/[,\s]+/)
        .map(code => code.trim())
        .filter(code => code.length > 0);

      const unionOverride = unionOverrideColumn ? row[unionOverrideColumn] : undefined;
      const provinceOverride = provinceOverrideColumn ? row[provinceOverrideColumn] : undefined;
      const defaultProvince = provinceColumn ? String(row[provinceColumn]).trim().toUpperCase() : 'ON';

      // Validate deduction code business rules
      const deductionResult = processDeductionCodes(
        deductionCodes,
        defaultProvince,
        unionOverride,
        provinceOverride
      );

      deductionResult.errors.forEach(error => {
        errors.push({
          row: rowIndex,
          field: 'deductionCodes',
          value: deductionCodesRaw,
          message: error
        });
      });

      // Validate override values if provided
      if (unionOverride && !['PSAC', 'NonUnion'].includes(unionOverride)) {
        errors.push({
          row: rowIndex,
          field: 'unionOverride',
          value: unionOverride,
          message: 'Union override must be either "PSAC" or "NonUnion"'
        });
      }

      if (provinceOverride && provinceOverride !== 'BC') {
        errors.push({
          row: rowIndex,
          field: 'provinceOverride',
          value: provinceOverride,
          message: 'Province override must be "BC"'
        });
      }
    }

    // Validate numeric fields
    ['salary', 'hourlyRate', 'standardHours'].forEach(field => {
      const column = mapping[field];
      if (column && row[column]) {
        const value = parseFloat(row[column]);
        if (isNaN(value) || value < 0) {
          errors.push({
            row: rowIndex,
            field,
            value: row[column],
            message: `${field} must be a positive number`
          });
        }
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function findDuplicateEmployeeIds(
  data: Record<string, any>[],
  mapping: Record<string, string>
): { duplicateIds: string[] } {
  const employeeIdColumn = mapping.employeeId;
  if (!employeeIdColumn) {
    return { duplicateIds: [] };
  }

  const idCounts: Record<string, number> = {};
  const duplicateIds: string[] = [];

  data.forEach(row => {
    const employeeId = row[employeeIdColumn];
    if (employeeId) {
      const idStr = String(employeeId).trim();
      idCounts[idStr] = (idCounts[idStr] || 0) + 1;
    }
  });

  Object.entries(idCounts).forEach(([id, count]) => {
    if (count > 1) {
      duplicateIds.push(id);
    }
  });

  return { duplicateIds };
}