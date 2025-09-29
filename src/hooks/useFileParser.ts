import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export interface ParsedFile {
  headers: string[];
  data: Record<string, any>[];
  fileName: string;
  totalRows: number;
}

export interface ColumnMapping {
  [key: string]: string | null; // our field -> csv column
}

export interface ImportError {
  row: number;
  field: string;
  value: any;
  message: string;
}

export function useFileParser() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const parseFile = async (file: File): Promise<ParsedFile | null> => {
    try {
      setLoading(true);

      const fileBuffer = await file.arrayBuffer();
      const fileType = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx';

      let workbook: XLSX.WorkBook;
      
      if (fileType === 'csv') {
        const text = new TextDecoder().decode(fileBuffer);
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        workbook = XLSX.read(fileBuffer, { type: 'array' });
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Parse to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        throw new Error('File appears to be empty');
      }

      const headers = (jsonData[0] as string[]).map(h => (h || '').toString().trim());
      const dataRows = jsonData.slice(1).filter(row => 
        Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== '')
      );

      const data = dataRows.map((row: any[], index) => {
        const rowData: Record<string, any> = { _rowIndex: index + 2 }; // +2 for header + 1-indexed
        headers.forEach((header, colIndex) => {
          rowData[header] = row[colIndex] || '';
        });
        return rowData;
      });

      return {
        headers,
        data,
        fileName: file.name,
        totalRows: data.length
      };

    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: "Parse Error",
        description: error instanceof Error ? error.message : 'Failed to parse file',
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${fileName}`;

      const { error } = await supabase.storage
        .from('imports')
        .upload(filePath, file);

      if (error) throw error;

      return filePath;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: "destructive"
      });
      return null;
    }
  };

  return {
    parseFile,
    uploadFile,
    loading
  };
}

// Predefined mappings for ADP employee exports
export const ADP_EMPLOYEE_MAPPINGS: Record<string, string> = {
  'Associate ID': 'employee_number',
  'Position ID': 'position_id',
  'Company Code': 'company_code',
  'Name': 'full_name',
  'First Name': 'first_name',
  'Last Name': 'last_name',
  'Tax ID': 'sin',
  'Date of Birth': 'birth_date',
  'File #': 'file_number',
  'File Number': 'file_number',
  'Job Title': 'job_title',
  'Position': 'job_title',
  'Reports To': 'reports_to',
  'Status': 'status',
  'Hire Date': 'hire_date',
  'Business Unit': 'business_unit',
  'Location': 'location',
  'Union Code': 'union_code',
  'Rate Type': 'rate_type',
  'Rate': 'rate',
  'Currency': 'currency',
  'Department': 'home_department',
  'Home Department': 'home_department',
  'Email': 'email',
  'Work Email': 'email',
  'Phone': 'phone',
  'Mobile': 'phone',
  'Address Line 1': 'address_line1',
  'Address Line 2': 'address_line2',
  'Address Line 3': 'address_line3',
  'City': 'city',
  'Province': 'province_code',
  'Province/Territory': 'province_code',
  'Postal Code': 'postal_code',
  'Standard Hours': 'standard_hours',
  'FTE': 'fte',
  'Pay Frequency': 'pay_frequency'
};

// Legacy paycode mappings for backwards compatibility
export const ADP_PAYCODE_MAPPINGS: Record<string, string> = {
  'Pay Code': 'code',
  'Pay Code Description': 'name',
  'Pay Code Name': 'name',
  'Description': 'description',
  'Category': 'category',
  'Rate Type': 'rate_type',
  'Multiplier': 'multiplier',
  'Hourly Rate': 'flat_hourly_rate',
  'GL Code': 'gl_earnings_code',
  'Earnings Code': 'gl_earnings_code',
  'Federal Taxable': 'taxable_federal',
  'CPP Taxable': 'taxable_cpp',
  'EI Taxable': 'taxable_ei',
  'Requires Hours': 'requires_hours',
  'Requires Amount': 'requires_amount',
  'Province': 'province',
  'Union Code': 'union_code',
  'Worksite': 'worksite_code',
  'Effective From': 'effective_from',
  'Effective To': 'effective_to',
  'Active': 'active'
};

// Employee fields for ADP import
export const EMPLOYEE_FIELDS = {
  employee_number: { label: 'Associate ID', required: true, type: 'text' },
  full_name: { label: 'Full Name', required: false, type: 'text' },
  first_name: { label: 'First Name', required: true, type: 'text' },
  last_name: { label: 'Last Name', required: true, type: 'text' },
  sin: { label: 'Tax ID (SIN)', required: false, type: 'text' },
  birth_date: { label: 'Date of Birth', required: false, type: 'date' },
  hire_date: { label: 'Hire Date', required: true, type: 'date' },
  job_title: { label: 'Job Title', required: false, type: 'text' },
  home_department: { label: 'Department', required: false, type: 'text' },
  province_code: { label: 'Province', required: true, type: 'select', options: ['ON', 'BC', 'AB', 'SK', 'MB', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU'] },
  status: { label: 'Status', required: false, type: 'select', options: ['Active', 'Terminated', 'Leave', 'Inactive'] },
  rate_type: { label: 'Rate Type', required: false, type: 'select', options: ['Salaried', 'Hourly', 'Contract'] },
  rate: { label: 'Rate', required: false, type: 'number' },
  standard_hours: { label: 'Standard Hours', required: false, type: 'number' },
  email: { label: 'Email', required: false, type: 'text' },
  phone: { label: 'Phone', required: false, type: 'text' },
  address_line1: { label: 'Address Line 1', required: false, type: 'text' },
  address_line2: { label: 'Address Line 2', required: false, type: 'text' },
  city: { label: 'City', required: false, type: 'text' },
  postal_code: { label: 'Postal Code', required: false, type: 'text' },
  business_unit: { label: 'Business Unit', required: false, type: 'text' },
  location: { label: 'Location', required: false, type: 'text' },
  union_code: { label: 'Union Code', required: false, type: 'text' },
  pay_frequency: { label: 'Pay Frequency', required: false, type: 'select', options: ['Weekly', 'Biweekly', 'SemiMonthly', 'Monthly'] },
  reports_to: { label: 'Reports To', required: false, type: 'text' },
  fte: { label: 'FTE', required: false, type: 'number' }
};

// Legacy paycode fields for backwards compatibility
export const PAYCODE_FIELDS = {
  code: { label: 'Pay Code', required: true, type: 'text' },
  name: { label: 'Name', required: true, type: 'text' },
  category: { label: 'Category', required: true, type: 'select', options: ['earning', 'overtime', 'pto', 'premium', 'bank', 'deduction', 'benefit'] },
  description: { label: 'Description', required: false, type: 'text' },
  taxable_federal: { label: 'Federal Taxable', required: false, type: 'boolean' },
  taxable_cpp: { label: 'CPP Taxable', required: false, type: 'boolean' },
  taxable_ei: { label: 'EI Taxable', required: false, type: 'boolean' },
  rate_type: { label: 'Rate Type', required: true, type: 'select', options: ['multiplier', 'flat_hourly', 'flat_amount'] },
  multiplier: { label: 'Multiplier', required: false, type: 'number' },
  flat_hourly_rate: { label: 'Flat Hourly Rate', required: false, type: 'number' },
  requires_hours: { label: 'Requires Hours', required: false, type: 'boolean' },
  requires_amount: { label: 'Requires Amount', required: false, type: 'boolean' },
  gl_earnings_code: { label: 'GL Earnings Code', required: false, type: 'text' },
  province: { label: 'Province', required: false, type: 'text' },
  union_code: { label: 'Union Code', required: false, type: 'text' },
  worksite_code: { label: 'Worksite Code', required: false, type: 'text' },
  effective_from: { label: 'Effective From', required: false, type: 'date' },
  effective_to: { label: 'Effective To', required: false, type: 'date' },
  active: { label: 'Active', required: false, type: 'boolean' }
};

// Auto-detect mapping for employee import
export function autoDetectEmployeeMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  
  Object.keys(EMPLOYEE_FIELDS).forEach(field => {
    mapping[field] = null;
  });

  // Try exact matches first
  headers.forEach(header => {
    const normalizedHeader = header.trim();
    const mappedField = ADP_EMPLOYEE_MAPPINGS[normalizedHeader];
    if (mappedField && mapping[mappedField] === null) {
      mapping[mappedField] = header;
    }
  });

  // Try fuzzy matches for common variations
  headers.forEach(header => {
    const lower = header.toLowerCase().trim();
    
    if (!mapping.employee_number && (lower.includes('associate') && lower.includes('id'))) {
      mapping.employee_number = header;
    } else if (!mapping.full_name && lower === 'name' && !lower.includes('first') && !lower.includes('last')) {
      mapping.full_name = header;
    } else if (!mapping.first_name && lower.includes('first') && lower.includes('name')) {
      mapping.first_name = header;
    } else if (!mapping.last_name && lower.includes('last') && lower.includes('name')) {
      mapping.last_name = header;
    } else if (!mapping.sin && (lower.includes('tax') && lower.includes('id')) || lower === 'sin') {
      mapping.sin = header;
    } else if (!mapping.birth_date && (lower.includes('birth') || lower.includes('dob'))) {
      mapping.birth_date = header;
    } else if (!mapping.hire_date && lower.includes('hire') && lower.includes('date')) {
      mapping.hire_date = header;
    } else if (!mapping.job_title && (lower.includes('job') && lower.includes('title')) || lower.includes('position')) {
      mapping.job_title = header;
    } else if (!mapping.home_department && lower.includes('department')) {
      mapping.home_department = header;
    } else if (!mapping.province_code && (lower.includes('province') || lower.includes('territory'))) {
      mapping.province_code = header;
    } else if (!mapping.status && lower === 'status') {
      mapping.status = header;
    } else if (!mapping.rate_type && lower.includes('rate') && lower.includes('type')) {
      mapping.rate_type = header;
    } else if (!mapping.rate && lower === 'rate') {
      mapping.rate = header;
    } else if (!mapping.email && lower.includes('email')) {
      mapping.email = header;
    } else if (!mapping.phone && (lower.includes('phone') || lower.includes('mobile'))) {
      mapping.phone = header;
    }
  });

  return mapping;
}

// Legacy auto-detect for paycode import
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  
  Object.keys(PAYCODE_FIELDS).forEach(field => {
    mapping[field] = null;
  });

  // Try exact matches first
  headers.forEach(header => {
    const normalizedHeader = header.trim();
    const mappedField = ADP_PAYCODE_MAPPINGS[normalizedHeader];
    if (mappedField && mapping[mappedField] === null) {
      mapping[mappedField] = header;
    }
  });

  // Try fuzzy matches for common variations
  headers.forEach(header => {
    const lower = header.toLowerCase().trim();
    
    if (!mapping.code && (lower.includes('code') || lower === 'pay code')) {
      mapping.code = header;
    } else if (!mapping.name && (lower.includes('name') || lower.includes('description'))) {
      mapping.name = header;
    } else if (!mapping.category && lower.includes('category')) {
      mapping.category = header;
    } else if (!mapping.rate_type && (lower.includes('rate') && lower.includes('type'))) {
      mapping.rate_type = header;
    } else if (!mapping.multiplier && lower.includes('multiplier')) {
      mapping.multiplier = header;
    } else if (!mapping.effective_from && (lower.includes('effective') && lower.includes('from'))) {
      mapping.effective_from = header;
    } else if (!mapping.effective_to && (lower.includes('effective') && lower.includes('to'))) {
      mapping.effective_to = header;
    }
  });

  return mapping;
}