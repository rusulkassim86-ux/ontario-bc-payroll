import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PayCodeUsageData {
  pay_code: string;
  pay_code_name?: string;
  category?: string;
  gl_earnings_code?: string;
  employee_name?: string;
  department?: string;
  total_hours: number;
  total_earnings: number;
  usage_count: number;
  avg_hours_per_use: number;
}

export interface PayCodeUsageSummary {
  totalPayCodes: number;
  totalHours: number;
  totalEarnings: number;
  employeesAffected: number;
}

interface UsePayCodeUsageProps {
  startDate: string;
  endDate: string;
  employeeId?: string;
  department?: string;
  groupBy: 'paycode' | 'employee' | 'department';
}

export function usePayCodeUsage({
  startDate,
  endDate,
  employeeId,
  department,
  groupBy
}: UsePayCodeUsageProps) {
  const [usageData, setUsageData] = useState<PayCodeUsageData[]>([]);
  const [summaryStats, setSummaryStats] = useState<PayCodeUsageSummary>({
    totalPayCodes: 0,
    totalHours: 0,
    totalEarnings: 0,
    employeesAffected: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, let's use a simpler approach and query timesheets directly
      // We'll need to add pay_code column to timesheets or use a different approach
      let query = supabase
        .from('timesheets')
        .select(`
          work_date,
          hours_regular,
          hours_ot1,
          hours_ot2,
          hours_stat,
          employee_id,
          project_code
        `)
        .gte('work_date', startDate)
        .lte('work_date', endDate);

      // Add employee filter if specified
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data: timesheetData, error: timesheetError } = await query;

      if (timesheetError) throw timesheetError;

      // Get employee data
      const employeeIds = [...new Set((timesheetData || []).map(t => t.employee_id))];
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_number')
        .in('id', employeeIds);

      if (employeeError) throw employeeError;

      // Get employee rates for calculations
      const { data: employeeRates, error: ratesError } = await supabase
        .from('employee_rates')
        .select('*')
        .in('employee_id', employeeIds);

      if (ratesError) throw ratesError;

      // Process the data
      const processedData = processTimesheetData(
        timesheetData || [],
        employeeData || [],
        employeeRates || [],
        groupBy,
        department
      );

      setUsageData(processedData.usage);
      setSummaryStats(processedData.summary);

    } catch (err) {
      console.error('Error fetching usage data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast({
        title: "Error",
        description: "Failed to fetch pay code usage data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, [startDate, endDate, employeeId, department, groupBy]);

  return {
    usageData,
    summaryStats,
    loading,
    error,
    refreshData: fetchUsageData
  };
}

function processTimesheetData(
  timesheetData: any[],
  employeeData: any[],
  employeeRates: any[],
  groupBy: string,
  departmentFilter?: string
): { usage: PayCodeUsageData[]; summary: PayCodeUsageSummary } {
  
  const rateMap = new Map(employeeRates.map(rate => [rate.employee_id, rate.base_rate]));
  const employeeMap = new Map(employeeData.map(emp => [emp.id, emp]));
  const usage = new Map<string, PayCodeUsageData>();
  
  let totalHours = 0;
  let totalEarnings = 0;
  const employeesSet = new Set<string>();
  const payCodesSet = new Set<string>();

  timesheetData.forEach(timesheet => {
    const employee = employeeMap.get(timesheet.employee_id);
    const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
    const baseRate = rateMap.get(timesheet.employee_id) || 25.0; // Default rate
    
    // For now, skip department filtering since we don't have department field
    // if (departmentFilter && employee?.department !== departmentFilter) {
    //   return;
    // }

    // Process each type of hours
    const hourTypes = [
      { hours: timesheet.hours_regular, code: 'REG', multiplier: 1.0 },
      { hours: timesheet.hours_ot1, code: 'OT1', multiplier: 1.0 },
      { hours: timesheet.hours_ot2, code: 'OT2', multiplier: 1.5 },
      { hours: timesheet.hours_stat, code: 'STAT', multiplier: 1.0 }
    ];

    hourTypes.forEach(({ hours, code, multiplier }) => {
      if (hours > 0) {
        const earnings = hours * baseRate * multiplier;
        
        // Create grouping key based on groupBy parameter
        let groupKey = '';
        let displayData: Partial<PayCodeUsageData> = {};

        switch (groupBy) {
          case 'employee':
            groupKey = `${timesheet.employee_id}-${code}`;
            displayData = {
              employee_name: employeeName,
              pay_code: code
            };
            break;
          case 'department':
            groupKey = `Unknown-${code}`; // Default since we don't have department field yet
            displayData = {
              department: 'Unknown',
              pay_code: code
            };
            break;
          default: // paycode
            groupKey = code;
            displayData = {
              pay_code: code
            };
        }

        if (!usage.has(groupKey)) {
          usage.set(groupKey, {
            pay_code: code,
            pay_code_name: getDefaultPayCodeName(code),
            category: getDefaultCategory(code),
            gl_earnings_code: getDefaultGLCode(code),
            employee_name: displayData.employee_name,
            department: displayData.department,
            total_hours: 0,
            total_earnings: 0,
            usage_count: 0,
            avg_hours_per_use: 0
          });
        }

        const existing = usage.get(groupKey)!;
        existing.total_hours += hours;
        existing.total_earnings += earnings;
        existing.usage_count += 1;
        existing.avg_hours_per_use = existing.total_hours / existing.usage_count;

        totalHours += hours;
        totalEarnings += earnings;
        employeesSet.add(timesheet.employee_id);
        payCodesSet.add(code);
      }
    });
  });

  const summary: PayCodeUsageSummary = {
    totalPayCodes: payCodesSet.size,
    totalHours,
    totalEarnings,
    employeesAffected: employeesSet.size
  };

  return {
    usage: Array.from(usage.values()).sort((a, b) => b.total_earnings - a.total_earnings),
    summary
  };
}

function getDefaultPayCodeName(code: string): string {
  const defaults: Record<string, string> = {
    'REG': 'Regular Hours',
    'OT1': 'Overtime 1.0x',
    'OT2': 'Overtime 1.5x',
    'STAT': 'Statutory Holiday',
    'VAC': 'Vacation',
    'SICK': 'Sick Leave'
  };
  return defaults[code] || code;
}

function getDefaultGLCode(code: string): string {
  const defaults: Record<string, string> = {
    'REG': '080',
    'OT1': '081',
    'OT2': '082',
    'STAT': '090',
    'VAC': '091',
    'SICK': '092'
  };
  return defaults[code] || '999';
}

function getDefaultCategory(code: string): string {
  if (code.startsWith('OT')) return 'overtime';
  if (['VAC', 'SICK'].includes(code)) return 'pto';
  if (code === 'STAT') return 'premium';
  return 'earning';
}