export type PayFrequency = 'Weekly' | 'Biweekly' | 'SemiMonthly' | 'Monthly';
export type Province = 'ON' | 'BC' | 'AB' | 'SK' | 'MB' | 'QC' | 'NB' | 'NS' | 'PE' | 'NL' | 'YT' | 'NT' | 'NU';

export type EmployeeCRAInput = {
  employeeId: string;
  province: Province;
  payFrequency: PayFrequency;
  grossPay: number;         // for the period
  ytd?: { 
    cpp?: number; 
    ei?: number; 
    fedTax?: number; 
    provTax?: number; 
    pensionable?: number; 
    insurable?: number; 
  };
  td1?: { 
    federalBasic?: number; 
    provincialBasic?: number; 
    additionalFed?: number; 
    additionalProv?: number; 
  };
  dob?: string;             // ISO
  sin?: string;             // masked in logs
};

export type CRAResult = {
  cpp: number;
  ei: number;
  fedTax: number;
  provTax: number;
  employerEi: number;
  netPay: number;
  meta: { 
    year: number; 
    source: 'api' | 'cache' | 'fallback';
  };
};

export type CRAConnectionStatus = {
  connected: boolean;
  apiUrl?: string;
  year?: number;
  error?: string;
};

export type CRAAuditEntry = {
  id: string;
  timestamp: string;
  employeeId: string;
  operation: 'calc' | 't4' | 'roe';
  request: any;
  responseMeta: any;
  status: 'success' | 'error' | 'timeout';
  durationMs: number;
  error?: string;
};