import { PayrollResult, PayrollInput } from "@/payroll/types";
import rates2025 from "@/payroll/rates-2025.json";

export async function calculatePayroll(input: PayrollInput): Promise<PayrollResult> {
  // 1. Annualize gross based on payFrequency
  const payPeriodsPerYear = getPayPeriodsPerYear(input.payFrequency);
  const annualGross = input.grossPay * payPeriodsPerYear;

  // 2. Calculate CPP 2025
  const cppDeduction = calculateCPP(annualGross, input.ytd?.cpp || 0, payPeriodsPerYear);

  // 3. Calculate EI 2025
  const eiDeduction = calculateEI(annualGross, input.ytd?.ei || 0, payPeriodsPerYear);
  
  // 4. Calculate taxable income (after CPP and EI)
  const taxableAnnual = annualGross - (cppDeduction.employee * payPeriodsPerYear) - (eiDeduction.employee * payPeriodsPerYear);

  // 5. Calculate Federal tax 2025
  const fedTax = calculateFederalTax(taxableAnnual, payPeriodsPerYear, input.ytd?.fedTax || 0);

  // 6. Calculate Provincial tax 2025
  const provTax = calculateProvincialTax(taxableAnnual, input.province, payPeriodsPerYear, input.ytd?.provTax || 0);

  // 7. Compute net pay
  const totalDeductions = cppDeduction.employee + eiDeduction.employee + fedTax + provTax;
  const netPay = input.grossPay - totalDeductions;

  return {
    netPay: Math.round(netPay * 100) / 100,
    deductions: {
      cpp: Math.round(cppDeduction.employee * 100) / 100,
      ei: Math.round(eiDeduction.employee * 100) / 100,
      fedTax: Math.round(fedTax * 100) / 100,
      provTax: Math.round(provTax * 100) / 100,
    },
    employerCosts: {
      ei: Math.round(eiDeduction.employer * 100) / 100,
      cpp: Math.round(cppDeduction.employer * 100) / 100,
    },
    summary: {
      gross: Math.round(input.grossPay * 100) / 100,
      taxableGross: Math.round((input.grossPay - cppDeduction.employee - eiDeduction.employee) * 100) / 100,
      frequency: input.payFrequency,
    },
  };
}

function getPayPeriodsPerYear(frequency: PayrollInput['payFrequency']): number {
  switch (frequency) {
    case 'Weekly': return 52;
    case 'Biweekly': return 26;
    case 'SemiMonthly': return 24;
    case 'Monthly': return 12;
    default: return 26;
  }
}

function calculateCPP(annualGross: number, ytdCpp: number, payPeriodsPerYear: number) {
  const { cpp } = rates2025;
  
  // Pensionable earnings = gross - basic exemption
  const pensionableEarnings = Math.max(0, annualGross - cpp.basicExemption);
  
  // Cap at YMPE - basic exemption
  const maxPensionableEarnings = cpp.ympe - cpp.basicExemption;
  const cappedPensionableEarnings = Math.min(pensionableEarnings, maxPensionableEarnings);
  
  // Annual CPP
  const annualCpp = cappedPensionableEarnings * cpp.rate;
  const maxAnnualCpp = maxPensionableEarnings * cpp.rate;
  
  // Account for YTD
  const remainingCpp = Math.max(0, maxAnnualCpp - ytdCpp);
  const periodCpp = Math.min(annualCpp / payPeriodsPerYear, remainingCpp / payPeriodsPerYear);
  
  return {
    employee: periodCpp,
    employer: periodCpp, // Employer matches employee contribution
  };
}

function calculateEI(annualGross: number, ytdEi: number, payPeriodsPerYear: number) {
  const { ei } = rates2025;
  
  // EI on insurable earnings up to maximum
  const insurableEarnings = Math.min(annualGross, ei.maxInsurableEarnings);
  const annualEi = insurableEarnings * ei.employeeRate;
  const maxAnnualEi = ei.maxInsurableEarnings * ei.employeeRate;
  
  // Account for YTD
  const remainingEi = Math.max(0, maxAnnualEi - ytdEi);
  const periodEi = Math.min(annualEi / payPeriodsPerYear, remainingEi / payPeriodsPerYear);
  
  return {
    employee: periodEi,
    employer: periodEi * ei.employerMultiplier,
  };
}

function calculateFederalTax(taxableAnnual: number, payPeriodsPerYear: number, ytdFedTax: number): number {
  const { federal } = rates2025;
  
  // Apply basic personal amount
  const taxableAfterBasic = Math.max(0, taxableAnnual - federal.basicPersonalAmount);
  
  let tax = 0;
  let previousBracketMax = 0;
  
  for (const bracket of federal.brackets) {
    if (taxableAfterBasic <= previousBracketMax) break;
    
    const bracketMax = bracket.upTo || Infinity;
    const taxableInBracket = Math.min(taxableAfterBasic, bracketMax) - previousBracketMax;
    
    if (taxableInBracket > 0) {
      tax += taxableInBracket * bracket.rate;
    }
    
    previousBracketMax = bracketMax;
    if (bracket.upTo === null) break;
  }
  
  // De-annualize and account for YTD
  const annualTax = tax;
  const periodTax = annualTax / payPeriodsPerYear;
  
  return Math.max(0, periodTax);
}

function calculateProvincialTax(taxableAnnual: number, province: "ON" | "BC", payPeriodsPerYear: number, ytdProvTax: number): number {
  const provData = rates2025.provincial[province];
  if (!provData) {
    throw new Error(`Province ${province} not supported`);
  }
  
  // Apply basic personal amount
  const taxableAfterBasic = Math.max(0, taxableAnnual - provData.basicPersonalAmount);
  
  let tax = 0;
  let previousBracketMax = 0;
  
  for (const bracket of provData.brackets) {
    if (taxableAfterBasic <= previousBracketMax) break;
    
    const bracketMax = bracket.upTo || Infinity;
    const taxableInBracket = Math.min(taxableAfterBasic, bracketMax) - previousBracketMax;
    
    if (taxableInBracket > 0) {
      tax += taxableInBracket * bracket.rate;
    }
    
    previousBracketMax = bracketMax;
    if (bracket.upTo === null) break;
  }
  
  // De-annualize and account for YTD
  const annualTax = tax;
  const periodTax = annualTax / payPeriodsPerYear;
  
  return Math.max(0, periodTax);
}