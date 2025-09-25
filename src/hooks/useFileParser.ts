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

// Predefined mappings for common payroll systems
export const ADP_COLUMN_MAPPINGS: Record<string, string> = {
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

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  
  Object.keys(PAYCODE_FIELDS).forEach(field => {
    mapping[field] = null;
  });

  // Try exact matches first
  headers.forEach(header => {
    const normalizedHeader = header.trim();
    const mappedField = ADP_COLUMN_MAPPINGS[normalizedHeader];
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