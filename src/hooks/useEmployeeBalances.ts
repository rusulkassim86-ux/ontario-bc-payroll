import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmployeeRate {
  id: string;
  employee_id: string;
  rate_type: 'hourly' | 'salary' | 'daily';
  base_rate: number;
  effective_from: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
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
  effective_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BalanceTransaction {
  id: string;
  employee_id: string;
  balance_type: 'vacation' | 'sick' | 'personal' | 'bereavement' | 'float' | 'banked_time';
  transaction_type: 'accrual' | 'usage' | 'adjustment' | 'carryover';
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_date: string;
  reference_type?: string;
  reference_id?: string;
  pay_code?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export function useEmployeeRates(employeeId: string) {
  const [rates, setRates] = useState<EmployeeRate[]>([]);
  const [currentRate, setCurrentRate] = useState<EmployeeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async () => {
    if (!employeeId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employee_rates')
        .select('*')
        .eq('employee_id', employeeId)
        .order('effective_from', { ascending: false });

      if (error) throw error;

      const rateData = (data || []) as EmployeeRate[];
      setRates(rateData);

      // Find current rate (most recent without end date or with future end date)
      const current = rateData.find(rate => 
        !rate.effective_to || new Date(rate.effective_to) > new Date()
      );
      setCurrentRate(current || null);

    } catch (err) {
      console.error('Error fetching employee rates:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [employeeId]);

  return {
    rates,
    currentRate,
    loading,
    error,
    refreshData: fetchRates
  };
}

export function useEmployeeBalances(employeeId: string) {
  const [balances, setBalances] = useState<EmployeeBalance[]>([]);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchBalances = async () => {
    if (!employeeId) return;

    try {
      setLoading(true);
      
      // Get current balances
      const { data: balanceData, error: balanceError } = await supabase
        .from('employee_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .order('balance_type', { ascending: true });

      if (balanceError) throw balanceError;

      setBalances((balanceData || []) as EmployeeBalance[]);

      // Get recent transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('balance_transactions')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionError) throw transactionError;

      setTransactions((transactionData || []) as BalanceTransaction[]);

    } catch (err) {
      console.error('Error fetching employee balances:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getBalance = (balanceType: string): EmployeeBalance | null => {
    return balances.find(b => b.balance_type === balanceType) || null;
  };

  const updateBalance = async (
    balanceType: string,
    amount: number,
    referenceType?: string,
    referenceId?: string,
    payCode?: string,
    notes?: string
  ) => {
    try {
      const currentBalance = getBalance(balanceType);
      if (!currentBalance) {
        throw new Error(`No balance found for type: ${balanceType}`);
      }

      const newBalance = currentBalance.current_balance + amount;
      const newUsedBalance = currentBalance.used_balance + (amount < 0 ? Math.abs(amount) : 0);

      // Insert transaction record
      const { error: transactionError } = await supabase
        .from('balance_transactions')
        .insert({
          employee_id: employeeId,
          balance_type: balanceType as any,
          transaction_type: amount < 0 ? 'usage' : 'accrual' as any,
          amount,
          balance_before: currentBalance.current_balance,
          balance_after: newBalance,
          reference_date: new Date().toISOString().split('T')[0],
          reference_type: referenceType,
          reference_id: referenceId,
          pay_code: payCode,
          notes
        });

      if (transactionError) throw transactionError;

      // Update balance
      const { error: balanceError } = await supabase
        .from('employee_balances')
        .update({
          current_balance: newBalance,
          used_balance: newUsedBalance
        })
        .eq('id', currentBalance.id);

      if (balanceError) throw balanceError;

      await fetchBalances(); // Refresh data

      toast({
        title: "Balance Updated",
        description: `${balanceType} balance ${amount > 0 ? 'increased' : 'decreased'} by ${Math.abs(amount)} hours`,
      });

    } catch (err) {
      console.error('Error updating balance:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to update balance',
        variant: "destructive"
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [employeeId]);

  return {
    balances,
    transactions,
    loading,
    error,
    getBalance,
    updateBalance,
    refreshData: fetchBalances
  };
}