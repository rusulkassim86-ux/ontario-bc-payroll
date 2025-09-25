import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { useEmployeeBalances } from '@/hooks/useEmployeeBalances';
import { calculateBalanceImpact } from '@/lib/payCalculation';
import { PayCode } from '@/hooks/usePayCodes';

interface BalanceIndicatorProps {
  employeeId: string;
  payCode: PayCode;
  hours: number;
}

export function BalanceIndicator({ employeeId, payCode, hours }: BalanceIndicatorProps) {
  const { getBalance, loading } = useEmployeeBalances(employeeId);

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground">
        Loading...
      </div>
    );
  }

  const balanceImpact = calculateBalanceImpact(payCode, hours);
  
  if (!balanceImpact.balanceType) {
    return null;
  }

  const balance = getBalance(balanceImpact.balanceType);
  if (!balance) {
    return null;
  }

  const isInsufficient = Math.abs(balanceImpact.impact) > balance.current_balance;
  const remainingAfter = balance.current_balance + balanceImpact.impact;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-xs">
            {isInsufficient && balanceImpact.impact < 0 ? (
              <AlertTriangle className="h-3 w-3 text-red-500" />
            ) : balanceImpact.impact < 0 ? (
              <TrendingDown className="h-3 w-3 text-orange-500" />
            ) : (
              <CheckCircle className="h-3 w-3 text-green-500" />
            )}
            
            <Badge 
              variant={isInsufficient && balanceImpact.impact < 0 ? "destructive" : "secondary"}
              className="text-xs px-1 py-0"
            >
              {balance.current_balance.toFixed(1)}h
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm space-y-1">
            <div className="font-medium capitalize">
              {balanceImpact.balanceType.replace('_', ' ')} Balance
            </div>
            <div>Current: {balance.current_balance.toFixed(1)} hours</div>
            <div>Impact: {balanceImpact.impact > 0 ? '+' : ''}{balanceImpact.impact.toFixed(1)} hours</div>
            <div>After: {remainingAfter.toFixed(1)} hours</div>
            {isInsufficient && balanceImpact.impact < 0 && (
              <div className="text-red-600 font-medium">
                Insufficient balance!
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}