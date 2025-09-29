// ADP-specific validation utilities with data normalization

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

export interface NormalizationResult {
  raw: any;
  normalized: any;
  hasChanged: boolean;
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

// Normalize date from various formats to ISO (YYYY-MM-DD)
export function normalizeDate(dateValue: any): NormalizationResult {
  if (!dateValue) {
    return { raw: dateValue, normalized: null, hasChanged: false };
  }

  const rawValue = String(dateValue).trim();
  
  // Try parsing various date formats
  const dateFormats = [
    // DD/MM/YYYY, DD-MM-YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    // MM/DD/YYYY, MM-DD-YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    // YYYY/MM/DD, YYYY-MM-DD
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/
  ];

  let normalizedDate: Date | null = null;

  // First try direct parsing (handles ISO format and many others)
  const directParse = new Date(rawValue);
  if (!isNaN(directParse.getTime())) {
    normalizedDate = directParse;
  } else {
    // Try manual parsing with different formats
    for (let i = 0; i < dateFormats.length; i++) {
      const match = rawValue.match(dateFormats[i]);
      if (match) {
        let day, month, year;
        
        if (i === 2) { // YYYY/MM/DD format
          [, year, month, day] = match;
        } else {
          // For DD/MM/YYYY and MM/DD/YYYY, assume DD/MM/YYYY for Canadian context
          // unless the day > 12, then assume MM/DD/YYYY
          const [, first, second, yearStr] = match;
          year = yearStr;
          if (parseInt(first) > 12) {
            month = first;
            day = second;
          } else if (parseInt(second) > 12) {
            day = first;
            month = second;
          } else {
            // Ambiguous case - assume DD/MM/YYYY for Canadian imports
            day = first;
            month = second;
          }
        }
        
        const testDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(testDate.getTime())) {
          normalizedDate = testDate;
          break;
        }
      }
    }
  }

  if (normalizedDate && !isNaN(normalizedDate.getTime())) {
    const isoString = normalizedDate.toISOString().split('T')[0];
    return {
      raw: rawValue,
      normalized: isoString,
      hasChanged: rawValue !== isoString
    };
  }

  return {
    raw: rawValue,
    normalized: null,
    hasChanged: false
  };
}

// Normalize province to 2-letter Canadian province code
export function normalizeProvince(provinceValue: any): NormalizationResult {
  if (!provinceValue) {
    return { raw: provinceValue, normalized: null, hasChanged: false };
  }

  const rawValue = String(provinceValue).trim();
  const upperValue = rawValue.toUpperCase();

  const provinceMap: Record<string, string> = {
    // Standard codes
    'ON': 'ON',
    'BC': 'BC',
    'AB': 'AB',
    'SK': 'SK',
    'MB': 'MB',
    'QC': 'QC',
    'NB': 'NB',
    'NS': 'NS',
    'PE': 'PE',
    'NL': 'NL',
    'YT': 'YT',
    'NT': 'NT',
    'NU': 'NU',
    
    // Full names
    'ONTARIO': 'ON',
    'BRITISH COLUMBIA': 'BC',
    'ALBERTA': 'AB',
    'SASKATCHEWAN': 'SK',
    'MANITOBA': 'MB',
    'QUEBEC': 'QC',
    'QUÉBEC': 'QC',
    'NEW BRUNSWICK': 'NB',
    'NOVA SCOTIA': 'NS',
    'PRINCE EDWARD ISLAND': 'PE',
    'NEWFOUNDLAND AND LABRADOR': 'NL',
    'NEWFOUNDLAND': 'NL',
    'YUKON': 'YT',
    'NORTHWEST TERRITORIES': 'NT',
    'NUNAVUT': 'NU',
    
    // ADP-style formats
    'ON - ONTARIO': 'ON',
    'BC - BRITISH COLUMBIA': 'BC',
    'AB - ALBERTA': 'AB',
    'SK - SASKATCHEWAN': 'SK',
    'MB - MANITOBA': 'MB',
    'QC - QUEBEC': 'QC',
    'QC - QUÉBEC': 'QC',
    'NB - NEW BRUNSWICK': 'NB',
    'NS - NOVA SCOTIA': 'NS',
    'PE - PRINCE EDWARD ISLAND': 'PE',
    'NL - NEWFOUNDLAND AND LABRADOR': 'NL',
    'YT - YUKON': 'YT',
    'NT - NORTHWEST TERRITORIES': 'NT',
    'NU - NUNAVUT': 'NU'
  };

  const normalized = provinceMap[upperValue];
  
  return {
    raw: rawValue,
    normalized: normalized || null,
    hasChanged: normalized ? rawValue !== normalized : false
  };
}

// Enhanced name splitting with "Last, First" support
export function normalizeName(nameValue: any): NormalizationResult & { 
  firstName: string; 
  lastName: string; 
} {
  if (!nameValue) {
    return { 
      raw: nameValue, 
      normalized: null, 
      hasChanged: false,
      firstName: '',
      lastName: ''
    };
  }

  const rawValue = String(nameValue).trim();
  let firstName = '';
  let lastName = '';

  // Check if it's "Last, First" format
  if (rawValue.includes(',')) {
    const parts = rawValue.split(',').map(part => part.trim());
    lastName = parts[0] || '';
    firstName = parts[1] || '';
  } else {
    // Split on whitespace
    const parts = rawValue.split(/\s+/);
    if (parts.length === 1) {
      // Only one word - put it in lastName
      lastName = parts[0];
    } else {
      // Multiple words - first is firstName, rest is lastName
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }
  }

  const normalized = firstName && lastName ? `${firstName} ${lastName}` : rawValue;
  
  return {
    raw: rawValue,
    normalized,
    hasChanged: rawValue !== normalized,
    firstName,
    lastName
  };
}

// Split full name into first and last name (legacy function)
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const result = normalizeName(fullName);
  return {
    firstName: result.firstName,
    lastName: result.lastName
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
    
    // Date validation with normalization
    const dateFields = ['hire_date', 'birth_date'];
    dateFields.forEach(field => {
      const column = mapping[field];
      if (column && row[column]) {
        const dateResult = normalizeDate(row[column]);
        if (!dateResult.normalized) {
          errors.push({
            row: rowNumber,
            field,
            message: `Invalid date format in ${field}: ${dateResult.raw}`
          });
        } else {
          const date = new Date(dateResult.normalized);
          if (field === 'birth_date') {
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
    
    // Province validation with normalization
    const provinceColumn = mapping.province_code;
    if (provinceColumn && row[provinceColumn]) {
      const provinceResult = normalizeProvince(row[provinceColumn]);
      if (!provinceResult.normalized) {
        errors.push({
          row: rowNumber,
          field: 'province_code',
          message: `Invalid province: ${provinceResult.raw}`
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