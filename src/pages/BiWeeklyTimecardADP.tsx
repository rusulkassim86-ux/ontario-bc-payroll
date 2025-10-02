import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Save, Check, Info } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTimesheetPayCodes } from "@/hooks/useTimesheetPayCodes";

interface TimecardRow {
  id: string;
  work_date: string;
  weekday: string;
  time_in: string | null;
  time_out: string | null;
  pay_code: string | null;
  hours: number | null;
  department: string | null;
  approved: boolean;
}

export default function BiWeeklyTimecardADP() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [timecardRows, setTimecardRows] = useState<TimecardRow[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [bulkApproveWeek1, setBulkApproveWeek1] = useState(false);
  const [bulkApproveWeek2, setBulkApproveWeek2] = useState(false);
  const [status, setStatus] = useState<'pending' | 'supervisor_approved' | 'final_approved'>('pending');
  const [isLocked, setIsLocked] = useState(false);

  // Calculate bi-weekly period
  const anchorDate = searchParams.get('start') || format(new Date(), 'yyyy-MM-dd');
  const periodStart = format(startOfWeek(new Date(anchorDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const periodEnd = format(addDays(new Date(periodStart), 13), 'yyyy-MM-dd');

  // Fetch employee info
  const { data: employeeData } = useQuery({
    queryKey: ['employee-minimal', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, company_code, home_department, pay_frequency')
        .eq('employee_number', employeeId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
    staleTime: 300_000,
  });

  // Fetch pay codes
  const companyCode = employeeData?.company_code || profile?.company_id;
  const { payCodes, loading: payCodesLoading, source: payCodesSource } = useTimesheetPayCodes(companyCode);

  // Fetch or create timecard (using blank rows only - no DB persistence for now)
  const { data: timecardData, isLoading, refetch } = useQuery({
    queryKey: ['timecard-adp', employeeId, periodStart, periodEnd],
    queryFn: async () => {
      // Generate blank rows immediately (fail-open approach)
      const blankRows = generateBlankRows(periodStart);
      return { timecard: blankRows, created: true };
    },
    enabled: !!employeeData?.id && !!periodStart,
    staleTime: 30_000,
  });

  // Initialize rows
  useEffect(() => {
    if (timecardData?.timecard && Array.isArray(timecardData.timecard)) {
      setTimecardRows(timecardData.timecard);
    } else if (!isLoading && timecardRows.length === 0) {
      setTimecardRows(generateBlankRows(periodStart));
    }
  }, [timecardData, isLoading]);

  // Generate 14 blank rows (Mon-Sun × 2)
  function generateBlankRows(start: string): TimecardRow[] {
    const rows: TimecardRow[] = [];
    const startDate = new Date(start);
    for (let i = 0; i < 14; i++) {
      const workDate = new Date(startDate);
      workDate.setDate(workDate.getDate() + i);
      const dayOfWeek = workDate.getDay();
      const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
      rows.push({
        id: `temp-${i}`,
        work_date: workDate.toISOString().split('T')[0],
        weekday,
        time_in: null,
        time_out: null,
        pay_code: null,
        hours: null,
        department: employeeData?.home_department || null,
        approved: false,
      });
    }
    return rows;
  }

  // Save mutation (local only for now)
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Simulate save (local state only)
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      setLastSaved(new Date());
      toast({
        title: "Saved",
        description: "Timecard saved successfully (local)",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save timecard",
        variant: "destructive",
      });
    },
  });

  // Supervisor approval
  const supervisorApproveMutation = useMutation({
    mutationFn: async () => {
      if (!employeeData) throw new Error("Employee not found");
      
      const totals = {
        reg: timecardRows.filter(r => r.pay_code === 'REG').reduce((sum, r) => sum + (r.hours || 0), 0),
        ot: timecardRows.filter(r => r.pay_code?.includes('OT') || r.pay_code === 'O/T').reduce((sum, r) => sum + (r.hours || 0), 0),
        stat: timecardRows.filter(r => r.pay_code === 'STAT').reduce((sum, r) => sum + (r.hours || 0), 0),
        vac: timecardRows.filter(r => r.pay_code === 'VAC').reduce((sum, r) => sum + (r.hours || 0), 0),
        sick: timecardRows.filter(r => r.pay_code === 'SICK').reduce((sum, r) => sum + (r.hours || 0), 0)
      };

      const week1Start = new Date(periodStart);
      const week2End = new Date(periodEnd);

      const { data, error } = await supabase.rpc('approve_timesheet_supervisor', {
        p_employee_id: employeeData.id,
        p_start_date: week1Start.toISOString().split('T')[0],
        p_end_date: week2End.toISOString().split('T')[0],
        p_selected_days: timecardRows.filter(r => r.hours && r.hours > 0).map(r => r.work_date),
        p_approval_note: 'Supervisor approved via ADP timecard',
        p_totals: totals
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setStatus('supervisor_approved');
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['timesheet-approvals'] });
      toast({
        title: "Supervisor Approved",
        description: "Timecard approved by supervisor. Ready for HR review.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve timecard",
        variant: "destructive",
      });
    }
  });

  // HR final approval
  const hrApproveMutation = useMutation({
    mutationFn: async () => {
      if (!employeeData) throw new Error("Employee not found");
      
      const week1Start = new Date(periodStart);
      const week2End = new Date(periodEnd);
      
      const { data, error } = await supabase.rpc('approve_timesheet_final', {
        p_employee_id: employeeData.id,
        p_start_date: week1Start.toISOString().split('T')[0],
        p_end_date: week2End.toISOString().split('T')[0],
        p_approval_note: 'HR/Payroll final approval via ADP timecard'
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setStatus('final_approved');
      setIsLocked(true);
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['timesheet-approvals'] });
      toast({
        title: "Final Approved",
        description: "Timecard finalized and locked. Ready for payroll.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to finalize timecard",
        variant: "destructive",
      });
    }
  });

  const updateRow = (index: number, field: keyof TimecardRow, value: any) => {
    const updated = [...timecardRows];
    updated[index] = { ...updated[index], [field]: value };
    setTimecardRows(updated);
  };

  const handleBulkApprove = (week: 1 | 2) => {
    const startIdx = week === 1 ? 0 : 7;
    const endIdx = startIdx + 7;
    const updated = [...timecardRows];
    const approveValue = week === 1 ? !bulkApproveWeek1 : !bulkApproveWeek2;
    
    for (let i = startIdx; i < endIdx; i++) {
      updated[i].approved = approveValue;
    }
    
    setTimecardRows(updated);
    if (week === 1) setBulkApproveWeek1(approveValue);
    else setBulkApproveWeek2(approveValue);
  };

  const calculateTotal = (row: TimecardRow) => {
    return row.hours ? parseFloat(row.hours.toString()).toFixed(2) : '0.00';
  };

  const isAdmin = profile?.role === 'org_admin' || profile?.role === 'payroll_admin';
  const canSupervise = profile?.role === 'manager' || isAdmin;

  const week1Rows = timecardRows.slice(0, 7);
  const week2Rows = timecardRows.slice(7, 14);

  const isFallbackMode = payCodesSource === 'fallback';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Bi-Weekly Timecard (ADP Style)"
        description={`${employeeData?.company_code || ''} - ${format(new Date(periodStart), 'MMM dd')}–${format(new Date(periodEnd), 'MMM dd, yyyy')}`}
        action={
          <div className="flex gap-2">
            <Link to={`/timecard/${employeeId}/biweekly`}>
              <Button variant="outline" size="sm">
                Switch to Classic
              </Button>
            </Link>
            <Button variant="outline" onClick={() => navigate('/timesheets')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      {timecardData?.created && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Blank timecard created for this period. Enter hours and save when ready.
          </AlertDescription>
        </Alert>
      )}

      {isFallbackMode && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            <Badge variant="outline">Offline list</Badge>
            Using cached codes for {companyCode}. Will update on next HTTP success.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Week 1 ({format(new Date(periodStart), 'MMM dd')}–{format(addDays(new Date(periodStart), 6), 'MMM dd')})</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleBulkApprove(1)}>
              <Checkbox checked={bulkApproveWeek1} className="mr-2" />
              Approve All Week 1
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">✓</TableHead>
                  <TableHead>Weekday</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>In</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead>Pay Code</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Daily Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {week1Rows.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Checkbox
                        checked={row.approved}
                        onCheckedChange={(checked) => updateRow(index, 'approved', checked)}
                        disabled={isLocked}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{row.weekday}</TableCell>
                    <TableCell>{format(new Date(row.work_date), 'MM/dd')}</TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={row.time_in || ''}
                        onChange={(e) => updateRow(index, 'time_in', e.target.value)}
                        disabled={isLocked}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={row.time_out || ''}
                        onChange={(e) => updateRow(index, 'time_out', e.target.value)}
                        disabled={isLocked}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.pay_code || ''}
                        onValueChange={(value) => updateRow(index, 'pay_code', value)}
                        disabled={isLocked || payCodesLoading}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Select code" />
                        </SelectTrigger>
                        <SelectContent>
                          {payCodes.map((pc) => (
                            <SelectItem key={pc.id} value={pc.code}>
                              {pc.code} - {pc.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.hours || ''}
                        onChange={(e) => updateRow(index, 'hours', parseFloat(e.target.value) || null)}
                        disabled={isLocked}
                        className="w-24"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={row.department || ''}
                        onChange={(e) => updateRow(index, 'department', e.target.value)}
                        disabled={isLocked}
                        className="w-32"
                        placeholder="Dept"
                      />
                    </TableCell>
                    <TableCell className="font-semibold">
                      {calculateTotal(row)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Week 2 ({format(addDays(new Date(periodStart), 7), 'MMM dd')}–{format(new Date(periodEnd), 'MMM dd')})</CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleBulkApprove(2)}>
              <Checkbox checked={bulkApproveWeek2} className="mr-2" />
              Approve All Week 2
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">✓</TableHead>
                  <TableHead>Weekday</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>In</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead>Pay Code</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Daily Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {week2Rows.map((row, index) => {
                  const actualIndex = index + 7;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Checkbox
                          checked={row.approved}
                          onCheckedChange={(checked) => updateRow(actualIndex, 'approved', checked)}
                          disabled={isLocked}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{row.weekday}</TableCell>
                      <TableCell>{format(new Date(row.work_date), 'MM/dd')}</TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={row.time_in || ''}
                          onChange={(e) => updateRow(actualIndex, 'time_in', e.target.value)}
                          disabled={isLocked}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={row.time_out || ''}
                          onChange={(e) => updateRow(actualIndex, 'time_out', e.target.value)}
                          disabled={isLocked}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.pay_code || ''}
                          onValueChange={(value) => updateRow(actualIndex, 'pay_code', value)}
                          disabled={isLocked || payCodesLoading}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue placeholder="Select code" />
                          </SelectTrigger>
                          <SelectContent>
                            {payCodes.map((pc) => (
                              <SelectItem key={pc.id} value={pc.code}>
                                {pc.code} - {pc.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={row.hours || ''}
                          onChange={(e) => updateRow(actualIndex, 'hours', parseFloat(e.target.value) || null)}
                          disabled={isLocked}
                          className="w-24"
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.department || ''}
                          onChange={(e) => updateRow(actualIndex, 'department', e.target.value)}
                          disabled={isLocked}
                          className="w-32"
                          placeholder="Dept"
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        {calculateTotal(row)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={isLocked || saveMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {saveMutation.isPending ? 'Saving...' : 'Save Draft'}
              </Button>

              {canSupervise && status === 'pending' && (
                <Button
                  onClick={() => supervisorApproveMutation.mutate()}
                  disabled={supervisorApproveMutation.isPending || isLocked}
                  variant="secondary"
                >
                  <Check className="mr-2 h-4 w-4" />
                  {supervisorApproveMutation.isPending ? 'Approving...' : 'Supervisor Approve'}
                </Button>
              )}

              {isAdmin && status === 'supervisor_approved' && (
                <Button
                  onClick={() => hrApproveMutation.mutate()}
                  disabled={hrApproveMutation.isPending || isLocked}
                  variant="default"
                >
                  <Check className="mr-2 h-4 w-4" />
                  {hrApproveMutation.isPending ? 'Finalizing...' : 'HR Final Approve'}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Badge variant={status === 'final_approved' ? 'default' : 'secondary'}>
                {status === 'supervisor_approved' ? 'Approved (Supervisor)' :
                 status === 'final_approved' ? 'Final Approved' : 'Pending'}
              </Badge>
              {lastSaved && (
                <span className="text-sm text-muted-foreground">
                  Last saved: {format(lastSaved, 'HH:mm:ss')}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
