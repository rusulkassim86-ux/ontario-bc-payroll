import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export interface BiWeeklyPeriod {
  week1Start: string;
  week1End: string;
  week2Start: string;
  week2End: string;
  periodLabel: string;
}

export interface TimesheetSummary {
  employee_id: string;
  employee_number: string;
  employee_name: string;
  period: BiWeeklyPeriod;
  week1Hours: {
    regular: number;
    overtime: number;
    stat: number;
  };
  week2Hours: {
    regular: number;
    overtime: number;
    stat: number;
  };
  totalHours: number;
  week1Approved: boolean;
  week2Approved: boolean;
  canProcessPayroll: boolean;
}

export function useTimesheetsByCompanyCode(companyCode: string | null) {
  const { profile } = useAuth();
  const [timesheets, setTimesheets] = useState<TimesheetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.company_id && companyCode) {
      fetchTimesheets();
    } else {
      setTimesheets([]);
      setLoading(false);
    }
  }, [profile?.company_id, companyCode]);

  const getGroupName = (code: string): string => {
    const groupMap: Record<string, string> = {
      'OZC': 'Kitsault',
      '72R': '72R',
      '72S': '72S',
    };
    return groupMap[code] || code;
  };

  const getCurrentBiWeeklyPeriod = (): BiWeeklyPeriod => {
    const today = new Date();
    const currentDay = today.getDay();
    const daysToSunday = currentDay === 0 ? 0 : 7 - currentDay;
    
    // Find the most recent Sunday
    const week2End = new Date(today);
    week2End.setDate(today.getDate() + daysToSunday);
    
    // Week 2 start (8 days before end)
    const week2Start = new Date(week2End);
    week2Start.setDate(week2End.getDate() - 6);
    
    // Week 1 end (1 day before Week 2 start)
    const week1End = new Date(week2Start);
    week1End.setDate(week2Start.getDate() - 1);
    
    // Week 1 start (7 days before Week 1 end)
    const week1Start = new Date(week1End);
    week1Start.setDate(week1End.getDate() - 6);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    return {
      week1Start: formatDate(week1Start),
      week1End: formatDate(week1End),
      week2Start: formatDate(week2Start),
      week2End: formatDate(week2End),
      periodLabel: `${week1Start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${week2End.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    };
  };

  const fetchTimesheets = async () => {
    if (!profile?.company_id || !companyCode) return;

    try {
      setLoading(true);
      setError(null);

      const groupName = getGroupName(companyCode);
      const period = getCurrentBiWeeklyPeriod();

      // Fetch employees for this company code
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, employee_number, first_name, last_name')
        .eq('company_id', profile.company_id)
        .eq('employee_group', groupName)
        .eq('status', 'active')
        .order('employee_number');

      if (empError) throw empError;

      if (!employees || employees.length === 0) {
        setTimesheets([]);
        setLoading(false);
        return;
      }

      const employeeIds = employees.map(e => e.id);

      // Fetch timesheets for the bi-weekly period
      const { data: timesheetData, error: tsError } = await supabase
        .from('timesheets')
        .select('*')
        .in('employee_id', employeeIds)
        .gte('work_date', period.week1Start)
        .lte('work_date', period.week2End)
        .order('work_date');

      if (tsError) throw tsError;

      // Fetch approval status
      const { data: approvals, error: appError } = await supabase
        .from('timesheet_approvals')
        .select('*')
        .in('employee_id', employeeIds)
        .or(`and(pay_period_start.eq.${period.week1Start},pay_period_end.eq.${period.week1End}),and(pay_period_start.eq.${period.week2Start},pay_period_end.eq.${period.week2End})`);

      if (appError) throw appError;

      // Group and aggregate data by employee
      const summaries: TimesheetSummary[] = employees.map(emp => {
        const empTimesheets = timesheetData?.filter(ts => ts.employee_id === emp.id) || [];
        
        const week1Data = empTimesheets.filter(ts => 
          ts.work_date >= period.week1Start && ts.work_date <= period.week1End
        );
        
        const week2Data = empTimesheets.filter(ts => 
          ts.work_date >= period.week2Start && ts.work_date <= period.week2End
        );

        const week1Hours = {
          regular: week1Data.reduce((sum, ts) => sum + (ts.hours_regular || 0), 0),
          overtime: week1Data.reduce((sum, ts) => sum + (ts.hours_ot1 || 0) + (ts.hours_ot2 || 0), 0),
          stat: week1Data.reduce((sum, ts) => sum + (ts.hours_stat || 0), 0),
        };

        const week2Hours = {
          regular: week2Data.reduce((sum, ts) => sum + (ts.hours_regular || 0), 0),
          overtime: week2Data.reduce((sum, ts) => sum + (ts.hours_ot1 || 0) + (ts.hours_ot2 || 0), 0),
          stat: week2Data.reduce((sum, ts) => sum + (ts.hours_stat || 0), 0),
        };

        const week1Approved = approvals?.some(app => 
          app.employee_id === emp.id && 
          app.pay_period_start === period.week1Start &&
          app.pay_period_end === period.week1End
        ) || false;

        const week2Approved = approvals?.some(app => 
          app.employee_id === emp.id && 
          app.pay_period_start === period.week2Start &&
          app.pay_period_end === period.week2End
        ) || false;

        return {
          employee_id: emp.id,
          employee_number: emp.employee_number,
          employee_name: `${emp.first_name} ${emp.last_name}`,
          period,
          week1Hours,
          week2Hours,
          totalHours: 
            week1Hours.regular + week1Hours.overtime + week1Hours.stat +
            week2Hours.regular + week2Hours.overtime + week2Hours.stat,
          week1Approved,
          week2Approved,
          canProcessPayroll: week1Approved && week2Approved,
        };
      });

      setTimesheets(summaries);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch timesheets');
      console.error('Error fetching timesheets:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    timesheets,
    loading,
    error,
    refreshTimesheets: fetchTimesheets,
  };
}
