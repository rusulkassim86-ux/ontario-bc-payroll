import { CalculatorProvider, PayrollInput, PayrollResult } from './CalculatorProvider';

// Current CRA rates for 2024
const CRA_RATES = {
  cpp: {
    rate: 0.0595, // 5.95%
    basicExemption: 3500,
    ympe: 68500, // Year's Maximum Pensionable Earnings
    employerRate: 0.0595
  },
  ei: {
    rate: 0.0229, // 2.29%
    maxInsurable: 63300,
    employerMultiplier: 1.4
  },
  federalTax: {
    basicPersonalAmount: 15000,
    brackets: [
      { min: 0, max: 55867, rate: 0.15 },
      { min: 55867, max: 111733, rate: 0.205 },
      { min: 111733, max: 173205, rate: 0.26 },
      { min: 173205, max: 246752, rate: 0.29 },
      { min: 246752, max: Infinity, rate: 0.33 }
    ]
  },
  provincialTax: {
    ON: {
      basicPersonalAmount: 12399,
      brackets: [
        { min: 0, max: 51446, rate: 0.0505 },
        { min: 51446, max: 102894, rate: 0.0915 },
        { min: 102894, max: 150000, rate: 0.1116 },
        { min: 150000, max: 220000, rate: 0.1216 },
        { min: 220000, max: Infinity, rate: 0.1316 }
      ]
    },
    BC: {
      basicPersonalAmount: 12760,
      brackets: [
        { min: 0, max: 47937, rate: 0.0506 },
        { min: 47937, max: 95875, rate: 0.077 },
        { min: 95875, max: 110076, rate: 0.105 },
        { min: 110076, max: 133664, rate: 0.1229 },
        { min: 133664, max: 181232, rate: 0.147 },
        { min: 181232, max: Infinity, rate: 0.168 }
      ]
    }
  }
};

export class LocalCraProvider implements CalculatorProvider {
  async calculate(input: PayrollInput): Promise<PayrollResult> {
    // Convert to annual amounts for calculations
    const payPeriodsPerYear = this.getPayPeriodsPerYear(input.payFrequency);
    const annualGross = input.grossPay * payPeriodsPerYear;
    
    // Calculate CPP
    const cpp = this.calculateCpp(annualGross, input.ytd?.cpp || 0, payPeriodsPerYear);
    
    // Calculate EI
    const ei = this.calculateEi(annualGross, input.ytd?.ei || 0, payPeriodsPerYear);
    
    // Calculate taxable income (gross - cpp - ei)
    const taxableAnnual = annualGross - (cpp.employee * payPeriodsPerYear) - (ei.employee * payPeriodsPerYear);
    
    // Calculate federal tax
    const fedTax = this.calculateFederalTax(
      taxableAnnual, 
      input.td1.federalBasic + (input.td1.additionalFed || 0),
      payPeriodsPerYear
    );
    
    // Calculate provincial tax
    const provTax = this.calculateProvincialTax(
      input.province,
      taxableAnnual,
      input.td1.provincialBasic + (input.td1.additionalProv || 0),
      payPeriodsPerYear
    );
    
    // Calculate net pay
    const totalDeductions = cpp.employee + ei.employee + fedTax + provTax;
    const netPay = input.grossPay - totalDeductions;
    
    return {
      netPay,
      deductions: {
        cpp: cpp.employee,
        ei: ei.employee,
        fedTax,
        provTax
      },
      employerCosts: {
        ei: ei.employer,
        cpp: cpp.employer
      },
      summary: {
        gross: input.grossPay,
        taxableGross: input.grossPay - cpp.employee - ei.employee,
        payFrequency: input.payFrequency
      }
    };
  }
  
  private getPayPeriodsPerYear(frequency: PayrollInput['payFrequency']): number {
    switch (frequency) {
      case 'Weekly': return 52;
      case 'Biweekly': return 26;
      case 'SemiMonthly': return 24;
      case 'Monthly': return 12;
      default: return 26;
    }
  }
  
  private calculateCpp(annualGross: number, ytdCpp: number, payPeriodsPerYear: number) {
    const pensionableEarnings = Math.max(0, annualGross - CRA_RATES.cpp.basicExemption);
    const maxPensionableEarnings = CRA_RATES.cpp.ympe - CRA_RATES.cpp.basicExemption;
    const cappedPensionableEarnings = Math.min(pensionableEarnings, maxPensionableEarnings);
    
    const annualCpp = cappedPensionableEarnings * CRA_RATES.cpp.rate;
    const maxAnnualCpp = maxPensionableEarnings * CRA_RATES.cpp.rate;
    
    // Account for YTD
    const remainingCpp = Math.max(0, maxAnnualCpp - ytdCpp);
    const periodCpp = Math.min(annualCpp / payPeriodsPerYear, remainingCpp / payPeriodsPerYear);
    
    return {
      employee: Math.round(periodCpp * 100) / 100,
      employer: Math.round(periodCpp * 100) / 100
    };
  }
  
  private calculateEi(annualGross: number, ytdEi: number, payPeriodsPerYear: number) {
    const maxAnnualEi = CRA_RATES.ei.maxInsurable * CRA_RATES.ei.rate;
    const annualEi = Math.min(annualGross, CRA_RATES.ei.maxInsurable) * CRA_RATES.ei.rate;
    
    // Account for YTD
    const remainingEi = Math.max(0, maxAnnualEi - ytdEi);
    const periodEi = Math.min(annualEi / payPeriodsPerYear, remainingEi / payPeriodsPerYear);
    
    const employeeEi = Math.round(periodEi * 100) / 100;
    const employerEi = Math.round(employeeEi * CRA_RATES.ei.employerMultiplier * 100) / 100;
    
    return {
      employee: employeeEi,
      employer: employerEi
    };
  }
  
  private calculateFederalTax(taxableAnnual: number, basicPersonalAmount: number, payPeriodsPerYear: number): number {
    const taxableAfterBasic = Math.max(0, taxableAnnual - basicPersonalAmount);
    let tax = 0;
    
    for (const bracket of CRA_RATES.federalTax.brackets) {
      if (taxableAfterBasic <= bracket.min) break;
      
      const taxableInBracket = Math.min(taxableAfterBasic, bracket.max) - bracket.min;
      tax += taxableInBracket * bracket.rate;
    }
    
    return Math.round((tax / payPeriodsPerYear) * 100) / 100;
  }
  
  private calculateProvincialTax(province: string, taxableAnnual: number, basicPersonalAmount: number, payPeriodsPerYear: number): number {
    const provTaxInfo = CRA_RATES.provincialTax[province as keyof typeof CRA_RATES.provincialTax];
    if (!provTaxInfo) {
      // Default to ON if province not found
      return this.calculateProvincialTax('ON', taxableAnnual, basicPersonalAmount, payPeriodsPerYear);
    }
    
    const taxableAfterBasic = Math.max(0, taxableAnnual - basicPersonalAmount);
    let tax = 0;
    
    for (const bracket of provTaxInfo.brackets) {
      if (taxableAfterBasic <= bracket.min) break;
      
      const taxableInBracket = Math.min(taxableAfterBasic, bracket.max) - bracket.min;
      tax += taxableInBracket * bracket.rate;
    }
    
    return Math.round((tax / payPeriodsPerYear) * 100) / 100;
  }
}