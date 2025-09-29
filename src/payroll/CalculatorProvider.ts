export type PayrollInput = {
  province: string; // e.g., 'ON'
  payFrequency: 'Weekly' | 'Biweekly' | 'SemiMonthly' | 'Monthly';
  grossPay: number;
  ytd?: { 
    cpp?: number; 
    ei?: number; 
    fedTax?: number; 
    provTax?: number; 
    gross?: number; 
  };
  td1: { 
    federalBasic: number; 
    provincialBasic: number; 
    additionalFed?: number; 
    additionalProv?: number; 
  };
  employee: { 
    birthDate?: string; 
    sin?: string; 
    unionCode?: string; 
  };
};

export type PayrollResult = {
  netPay: number;
  deductions: {
    cpp: number; 
    ei: number; 
    fedTax: number; 
    provTax: number;
    other?: Record<string, number>;
  };
  employerCosts: { 
    ei: number; 
    cpp?: number; 
    other?: Record<string, number>; 
  };
  summary: { 
    gross: number; 
    taxableGross: number; 
    payFrequency: string; 
  };
};

export interface CalculatorProvider {
  calculate(input: PayrollInput): Promise<PayrollResult>;
}