import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  AlertTriangle, 
  Calculator, 
  DollarSign, 
  Clock, 
  TrendingDown,
  TrendingUp,
  Info
} from 'lucide-react';
import { PayCode } from '@/hooks/usePayCodes';
import { useEmployeeRates, useEmployeeBalances } from '@/hooks/useEmployeeBalances';
import { 
  calculatePay, 
  validateBalance, 
  calculateBalanceImpact, 
  validateOvertimeRules,
  PayCalculationResult 
} from '@/lib/payCalculation';

interface PayCalculationDisplayProps {
  employeeId: string;
  payCode: PayCode;
  hours: number;
  amount?: number;
  date: Date;
  onHoursChange?: (hours: number) => void;
  onAmountChange?: (amount: number) => void;
  showValidation?: boolean;
  isAdmin?: boolean;
  dailyRegularHours?: number;
  weeklyRegularHours?: number;
}

export function PayCalculationDisplay({
  employeeId,
  payCode,
  hours,
  amount,
  date,
  onHoursChange,
  onAmountChange,
  showValidation = true,
  isAdmin = false,
  dailyRegularHours = 0,
  weeklyRegularHours = 0
}: PayCalculationDisplayProps) {
  const { currentRate, loading: ratesLoading } = useEmployeeRates(employeeId);
  const { getBalance, updateBalance } = useEmployeeBalances(employeeId);
  const [isCalculating, setIsCalculating] = useState(false);

  if (ratesLoading || !currentRate) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading employee rate...
      </div>
    );
  }

  // Calculate pay
  const calculation: PayCalculationResult = calculatePay({
    hours,
    amount,
    payCode,
    employeeRate: currentRate,
    date,
    isOvertime: payCode.category === 'overtime'
  });

  // Balance validation for PTO/Bank codes
  const balanceImpact = calculateBalanceImpact(payCode, hours);
  let balanceValidation = null;
  
  if (balanceImpact.balanceType) {
    const balance = getBalance(balanceImpact.balanceType);
    if (balance) {
      balanceValidation = validateBalance(payCode, hours, balance.current_balance, isAdmin);
    }
  }

  // Overtime validation
  const overtimeWarnings = validateOvertimeRules(
    payCode,
    hours,
    dailyRegularHours,
    weeklyRegularHours
  );

  const allWarnings = [
    ...calculation.warnings,
    ...(balanceValidation?.warnings || []),
    ...overtimeWarnings
  ];

  const handleBalanceUpdate = async () => {
    if (balanceImpact.balanceType && hours > 0) {
      setIsCalculating(true);
      try {
        await updateBalance(
          balanceImpact.balanceType,
          balanceImpact.impact,
          'timesheet',
          undefined,
          payCode.code,
          `Timesheet entry for ${hours} hours`
        );
      } catch (error) {
        console.error('Failed to update balance:', error);
      } finally {
        setIsCalculating(false);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Pay Calculation Result */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-semibold">Gross Earnings</span>
            </div>
            <span className="text-xl font-bold text-green-600">
              ${calculation.grossEarnings.toFixed(2)}
            </span>
          </div>
          
          <div className="text-sm text-muted-foreground mb-2">
            {calculation.calculation}
          </div>

          {calculation.glCode && (
            <Badge variant="outline" className="text-xs">
              GL: {calculation.glCode}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Input Controls */}
      <div className="grid grid-cols-2 gap-2">
        {payCode.requires_hours && (
          <div className="space-y-1">
            <label className="text-xs font-medium">Hours</label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.25"
                min="0"
                max="24"
                value={hours}
                onChange={(e) => onHoursChange?.(parseFloat(e.target.value) || 0)}
                className="text-sm"
              />
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        )}
        
        {payCode.requires_amount && (
          <div className="space-y-1">
            <label className="text-xs font-medium">Amount</label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount || ''}
                onChange={(e) => onAmountChange?.(parseFloat(e.target.value) || 0)}
                className="text-sm"
              />
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Balance Impact */}
      {balanceImpact.balanceType && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {balanceImpact.impact > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm font-medium">
                  {balanceImpact.balanceType.replace('_', ' ').toUpperCase()} Balance
                </span>
              </div>
              
              {balanceValidation && (
                <div className="flex items-center gap-1">
                  <span className="text-sm">
                    {balanceValidation.currentBalance.toFixed(1)}h available
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{balanceImpact.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground">
              {balanceImpact.description}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings and Validation */}
      {showValidation && allWarnings.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50/50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <div className="space-y-1">
              {allWarnings.map((warning, index) => (
                <div key={index} className="text-sm text-amber-800">
                  • {warning}
                </div>
              ))}
            </div>
            
            {balanceValidation && !balanceValidation.isValid && balanceValidation.canOverride && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 border-amber-300"
                onClick={handleBalanceUpdate}
                disabled={isCalculating}
              >
                {isCalculating ? 'Processing...' : 'Admin Override'}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Pay Code Details */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-xs">
          {payCode.category}
        </Badge>
        <span>•</span>
        <span>{payCode.rate_type.replace('_', ' ')}</span>
        {payCode.multiplier && (
          <>
            <span>•</span>
            <span>{payCode.multiplier}x rate</span>
          </>
        )}
        {payCode.stackable && (
          <>
            <span>•</span>
            <Badge variant="secondary" className="text-xs">stackable</Badge>
          </>
        )}
      </div>
    </div>
  );
}