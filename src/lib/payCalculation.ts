import { PayCode } from '@/hooks/usePayCodes';

export interface EmployeeRate {
  id: string;
  employee_id: string;
  rate_type: 'hourly' | 'salary' | 'daily';
  base_rate: number;
  effective_from: string;
  effective_to?: string;
}

export interface EmployeeBalance {
  id: string;
  employee_id: string;
  balance_type: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'float' | 'banked_time';
  current_balance: number;
  accrued_balance: number;
  used_balance: number;
  policy_annual_accrual?: number;
  policy_max_carryover?: number;
  policy_max_balance?: number;
}

export interface PayCalculationInput {
  hours: number;
  amount?: number;
  payCode: PayCode;
  employeeRate: EmployeeRate;
  date: Date;
  isOvertime?: boolean;
  stackedPremiums?: PayCode[];
}

export interface PayCalculationResult {
  grossEarnings: number;
  baseEarnings: number;
  premiumEarnings: number;
  calculation: string;
  warnings: string[];
  glCode?: string;
  isStackable: boolean;
}

export interface BalanceValidationResult {
  isValid: boolean;
  currentBalance: number;
  requiredBalance: number;
  warnings: string[];
  canOverride: boolean;
}

/**
 * Calculate pay based on pay code rules
 */
export function calculatePay(input: PayCalculationInput): PayCalculationResult {
  const { hours, amount, payCode, employeeRate, isOvertime, stackedPremiums } = input;
  const warnings: string[] = [];
  let grossEarnings = 0;
  let baseEarnings = 0;
  let premiumEarnings = 0;
  let calculation = '';

  // Validation checks
  if (payCode.requires_hours && hours <= 0) {
    warnings.push(`Pay code ${payCode.code} requires hours but none provided`);
  }
  
  if (!payCode.requires_hours && hours > 0) {
    warnings.push(`Pay code ${payCode.code} does not require hours but ${hours} hours provided`);
  }

  if (payCode.requires_amount && !amount) {
    warnings.push(`Pay code ${payCode.code} requires an amount but none provided`);
  }

  // Calculate based on rate type
  switch (payCode.rate_type) {
    case 'flat_amount':
      grossEarnings = amount || 0;
      calculation = `Fixed amount: $${(amount || 0).toFixed(2)}`;
      break;

    case 'flat_hourly':
      // Use the pay code's multiplier as the flat hourly rate if available
      const flatRate = payCode.multiplier || employeeRate.base_rate;
      grossEarnings = hours * flatRate;
      calculation = `${hours}h × $${flatRate.toFixed(2)}/h = $${grossEarnings.toFixed(2)}`;
      break;

    case 'multiplier':
    default:
      const multiplier = payCode.multiplier || 1.0;
      baseEarnings = hours * employeeRate.base_rate;
      
      if (payCode.category === 'premium' && payCode.stackable && stackedPremiums?.length) {
        // Premium stacks with base rate
        premiumEarnings = hours * employeeRate.base_rate * (multiplier - 1.0);
        grossEarnings = baseEarnings + premiumEarnings;
        calculation = `${hours}h × $${employeeRate.base_rate.toFixed(2)}/h × ${multiplier}x = $${grossEarnings.toFixed(2)} (Base: $${baseEarnings.toFixed(2)}, Premium: $${premiumEarnings.toFixed(2)})`;
      } else {
        grossEarnings = baseEarnings * multiplier;
        calculation = `${hours}h × $${employeeRate.base_rate.toFixed(2)}/h × ${multiplier}x = $${grossEarnings.toFixed(2)}`;
      }
      break;
  }

  return {
    grossEarnings,
    baseEarnings,
    premiumEarnings,
    calculation,
    warnings,
    glCode: payCode.gl_earnings_code,
    isStackable: payCode.stackable
  };
}

/**
 * Validate balance availability for PTO/banked time codes
 */
export function validateBalance(
  payCode: PayCode, 
  hours: number, 
  currentBalance: number,
  isAdmin: boolean = false
): BalanceValidationResult {
  const warnings: string[] = [];
  let isValid = true;
  let canOverride = false;

  if (['pto', 'bank'].includes(payCode.category)) {
    if (hours > currentBalance) {
      isValid = false;
      canOverride = isAdmin;
      warnings.push(
        `Insufficient balance: ${hours}h requested but only ${currentBalance}h available`
      );
      
      if (canOverride) {
        warnings.push('Admin override available for negative balance');
      }
    }
  }

  return {
    isValid,
    currentBalance,
    requiredBalance: hours,
    warnings,
    canOverride
  };
}

/**
 * Calculate balance impact for timeoff codes
 */
export function calculateBalanceImpact(
  payCode: PayCode,
  hours: number
): { balanceType?: string; impact: number; description: string } {
  
  if (payCode.category === 'pto') {
    let balanceType: string;
    
    // Map pay code to balance type based on code
    if (payCode.code.toLowerCase().includes('vac')) {
      balanceType = 'vacation';
    } else if (payCode.code.toLowerCase().includes('sick')) {
      balanceType = 'sick';
    } else if (payCode.code.toLowerCase().includes('personal')) {
      balanceType = 'personal';
    } else if (payCode.code.toLowerCase().includes('bereavement')) {
      balanceType = 'bereavement';
    } else if (payCode.code.toLowerCase().includes('float')) {
      balanceType = 'float';
    } else {
      // Default to vacation for generic PTO codes
      balanceType = 'vacation';
    }

    return {
      balanceType,
      impact: -hours, // Negative impact (deduction)
      description: `Will deduct ${hours}h from ${balanceType} balance`
    };
  }

  if (payCode.category === 'bank') {
    if (payCode.code.toLowerCase().includes('taken')) {
      return {
        balanceType: 'banked_time',
        impact: -hours,
        description: `Will deduct ${hours}h from banked time balance`
      };
    } else {
      return {
        balanceType: 'banked_time',
        impact: hours,
        description: `Will add ${hours}h to banked time balance`
      };
    }
  }

  return {
    impact: 0,
    description: 'No balance impact'
  };
}

/**
 * Check for overtime conflicts with pay codes
 */
export function validateOvertimeRules(
  payCode: PayCode,
  hours: number,
  dailyRegularHours: number,
  weeklyRegularHours: number,
  dailyOTLimit: number = 8,
  weeklyOTLimit: number = 40
): string[] {
  const warnings: string[] = [];

  if (payCode.category === 'overtime') {
    // OT pay codes should not conflict with automatic OT calculation
    if (dailyRegularHours < dailyOTLimit && weeklyRegularHours < weeklyOTLimit) {
      warnings.push(
        `Using OT pay code but employee hasn't reached daily (${dailyOTLimit}h) or weekly (${weeklyOTLimit}h) OT thresholds`
      );
    }
  } else if (payCode.category === 'earning') {
    // Regular earnings during OT territory
    if (dailyRegularHours + hours > dailyOTLimit) {
      warnings.push(
        `Regular hours may trigger automatic OT calculation. Consider using OT pay code for hours over ${dailyOTLimit}h daily`
      );
    }
  }

  return warnings;
}