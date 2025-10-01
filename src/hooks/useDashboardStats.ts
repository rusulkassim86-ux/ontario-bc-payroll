import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

export interface DashboardStats {
  activeEmployees: number;
  lastPayrollAmount: number | null;
  nextPayDate: string | null;
  craRemittanceDue: string | null;
  recentActivity: Array<{
    id: string;
    title: string;
    description: string;
    date: string;
    type: string;
  }>;
  pendingTimesheets: number;
  missingTD1Forms: number;
}

export function useDashboardStats() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeEmployees: 0,
    lastPayrollAmount: null,
    nextPayDate: null,
    craRemittanceDue: null,
    recentActivity: [],
    pendingTimesheets: 0,
    missingTD1Forms: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchDashboardStats();
    }
  }, [profile?.company_id]);

  const fetchDashboardStats = async () => {
    if (!profile?.company_id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch active employees
      const { count: employeeCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .eq('status', 'active');

      // Fetch last payroll amount
      const { data: lastPayRun } = await supabase
        .from('pay_runs')
        .select('id, created_at')
        .eq('company_id', profile.company_id)
        .eq('status', 'processed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let lastPayrollAmount = null;
      if (lastPayRun) {
        const { data: payLines } = await supabase
          .from('pay_run_lines')
          .select('gross_pay')
          .eq('pay_run_id', lastPayRun.id);
        
        if (payLines && payLines.length > 0) {
          lastPayrollAmount = payLines.reduce((sum, line) => sum + (line.gross_pay || 0), 0);
        }
      }

      // Fetch next pay calendar
      const { data: nextPayCalendar } = await supabase
        .from('pay_calendars')
        .select('pay_date')
        .eq('company_id', profile.company_id)
        .eq('status', 'upcoming')
        .order('pay_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      // Fetch next CRA remittance due date
      const { data: nextRemittance } = await supabase
        .from('cra_remittance_reports')
        .select('due_date')
        .eq('company_id', profile.company_id)
        .eq('status', 'draft')
        .order('due_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      // Fetch recent audit logs for activity
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      const recentActivity = (auditLogs || []).map((log) => ({
        id: log.id,
        title: formatActivityTitle(log.action),
        description: formatActivityDescription(log),
        date: new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        type: log.action,
      }));

      // Fetch pending timesheets for company employees
      const { data: companyEmployees } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', profile.company_id);

      const employeeIds = companyEmployees?.map(e => e.id) || [];
      
      let pendingTimesheetsCount = 0;
      if (employeeIds.length > 0) {
        const { count } = await supabase
          .from('timesheets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .in('employee_id', employeeIds);
        pendingTimesheetsCount = count || 0;
      }

      // Fetch employees missing TD1 forms (no custom field for TD1)
      const { data: employeesWithTD1 } = await supabase
        .from('employee_custom_fields')
        .select('employee_id')
        .eq('field_name', 'td1_form_completed')
        .eq('field_value', 'true');

      const employeesWithTD1Ids = new Set(employeesWithTD1?.map(e => e.employee_id) || []);
      const missingTD1Forms = (employeeCount || 0) - employeesWithTD1Ids.size;

      setStats({
        activeEmployees: employeeCount || 0,
        lastPayrollAmount,
        nextPayDate: nextPayCalendar?.pay_date || null,
        craRemittanceDue: nextRemittance?.due_date || null,
        recentActivity,
        pendingTimesheets: pendingTimesheetsCount || 0,
        missingTD1Forms: Math.max(0, missingTD1Forms),
      });

    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard stats');
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatActivityTitle = (action: string): string => {
    const titleMap: Record<string, string> = {
      'CREATE_EMPLOYEE': 'New Employee Added',
      'PROCESS_PAYROLL': 'Payroll Run Completed',
      'UPDATE_TAX_TABLES': 'Tax Tables Updated',
      'APPROVE_TIMESHEET': 'Timesheet Approved',
      'GENERATE_CRA_REMITTANCE': 'CRA Remittance Generated',
    };
    return titleMap[action] || action.replace(/_/g, ' ').toLowerCase();
  };

  const formatActivityDescription = (log: any): string => {
    if (log.action === 'PROCESS_PAYROLL') {
      return `${log.metadata?.employee_count || 0} employees processed`;
    }
    if (log.action === 'CREATE_EMPLOYEE') {
      return log.after_data?.first_name && log.after_data?.last_name 
        ? `${log.after_data.first_name} ${log.after_data.last_name}` 
        : 'New employee';
    }
    return log.entity_type || '';
  };

  return {
    stats,
    loading,
    error,
    refreshStats: fetchDashboardStats,
  };
}
