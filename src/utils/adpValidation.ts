// ADP-specific validation utilities

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Validate Canadian SIN using Luhn algorithm
export function validateSIN(sin: string): boolean {
  if (!sin) return false;
  
  const digits = sin.replace(/\D/g, '');
  if (digits.length !== 9) return false;
  
  // Luhn algorithm for SIN validation
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(digits[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  
  return sum % 10 === 0;
}

// Validate Canadian postal code
export function validatePostalCode(postalCode: string): boolean {
  if (!postalCode) return false;
  
  const cleaned = postalCode.replace(/\s+/g, '').toUpperCase();
  const canadianPostalRegex = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;
  
  return canadianPostalRegex.test(cleaned);
}

// Split full name into first and last name
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || ''
  };
}

// Validate employee data for ADP import
export function validateEmployeeData(
  data: Record<string, any>[], 
  mapping: Record<string, string>
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  data.forEach((row, index) => {
    const rowNumber = index + 2; // Account for header row + 1-indexed
    
    // Required field validation
    const requiredFields = ['employee_number', 'first_name', 'last_name', 'hire_date', 'province_code'];
    
    requiredFields.forEach(field => {
      const column = mapping[field];
      if (!column || !row[column] || String(row[column]).trim() === '') {
        errors.push({
          row: rowNumber,
          field,
          message: `Required field ${field} is missing or empty`
        });
      }
    });
    
    // SIN validation (if provided)
    const sinColumn = mapping.sin;
    if (sinColumn && row[sinColumn]) {
      const sin = String(row[sinColumn]).replace(/\D/g, '');
      if (sin && !validateSIN(sin)) {
        warnings.push({
          row: rowNumber,
          field: 'sin',
          message: 'Invalid SIN format or checksum'
        });
      }
    }
    
    // Postal code validation
    const postalColumn = mapping.postal_code;
    if (postalColumn && row[postalColumn]) {
      const postal = String(row[postalColumn]);
      if (!validatePostalCode(postal)) {
        warnings.push({
          row: rowNumber,
          field: 'postal_code',
          message: 'Invalid Canadian postal code format'
        });
      }
    }
    
    // Date validation
    const dateFields = ['hire_date', 'birth_date'];
    dateFields.forEach(field => {
      const column = mapping[field];
      if (column && row[column]) {
        const date = new Date(row[column]);
        if (isNaN(date.getTime())) {
          errors.push({
            row: rowNumber,
            field,
            message: `Invalid date format in ${field}`
          });
        } else if (field === 'birth_date') {
          // Check minimum age (14 years)
          const minDate = new Date();
          minDate.setFullYear(minDate.getFullYear() - 14);
          if (date > minDate) {
            errors.push({
              row: rowNumber,
              field,
              message: 'Employee must be at least 14 years old'
            });
          }
        } else if (field === 'hire_date') {
          // Check hire date is not in future
          const today = new Date();
          if (date > today) {
            warnings.push({
              row: rowNumber,
              field,
              message: 'Hire date is in the future'
            });
          }
        }
      }
    });
    
    // Email validation
    const emailColumn = mapping.email;
    if (emailColumn && row[emailColumn]) {
      const email = String(row[emailColumn]);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        warnings.push({
          row: rowNumber,
          field: 'email',
          message: 'Invalid email format'
        });
      }
    }
    
    // Province validation
    const provinceColumn = mapping.province_code;
    if (provinceColumn && row[provinceColumn]) {
      const province = String(row[provinceColumn]).toUpperCase();
      const validProvinces = ['ON', 'BC', 'AB', 'SK', 'MB', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU'];
      if (!validProvinces.includes(province)) {
        errors.push({
          row: rowNumber,
          field: 'province_code',
          message: `Invalid province code: ${province}`
        });
      }
    }
    
    // Rate validation
    const rateColumn = mapping.rate;
    if (rateColumn && row[rateColumn]) {
      const rate = parseFloat(row[rateColumn]);
      if (isNaN(rate) || rate < 0) {
        errors.push({
          row: rowNumber,
          field: 'rate',
          message: 'Rate must be a positive number'
        });
      } else if (rate > 1000) {
        warnings.push({
          row: rowNumber,
          field: 'rate',
          message: 'Rate seems unusually high, please verify'
        });
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Check for duplicate employees
export function findDuplicateEmployees(
  data: Record<string, any>[], 
  mapping: Record<string, string>
): { duplicateIds: string[]; duplicateEmails: string[] } {
  const duplicateIds: string[] = [];
  const duplicateEmails: string[] = [];
  
  // Check for duplicate employee numbers
  const employeeIds = new Set<string>();
  const emails = new Set<string>();
  
  data.forEach(row => {
    const idColumn = mapping.employee_number;
    if (idColumn && row[idColumn]) {
      const id = String(row[idColumn]).trim();
      if (employeeIds.has(id)) {
        duplicateIds.push(id);
      } else {
        employeeIds.add(id);
      }
    }
    
    const emailColumn = mapping.email;
    if (emailColumn && row[emailColumn]) {
      const email = String(row[emailColumn]).trim().toLowerCase();
      if (emails.has(email)) {
        duplicateEmails.push(email);
      } else {
        emails.add(email);
      }
    }
  });
  
  return { duplicateIds, duplicateEmails };
}