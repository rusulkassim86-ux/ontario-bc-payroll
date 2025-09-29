export type PayrollInput = {
  grossPay: number;              // for the period
  province: "ON" | "BC";
  payFrequency: "Weekly"|"Biweekly"|"SemiMonthly"|"Monthly";
  ytd?: { cpp?: number; ei?: number; fedTax?: number; provTax?: number };
};

export type PayrollResult = {
  netPay: number;
  deductions: {
    cpp: number;
    ei: number;
    fedTax: number;
    provTax: number;
  };
  employerCosts: {
    ei: number;
    cpp: number;
  };
  summary: {
    gross: number;
    taxableGross: number;
    frequency: string;
  };
};