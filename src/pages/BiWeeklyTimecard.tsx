import { useState, useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Info, AlertCircle, ArrowLeft, Save, Lock, Unlock } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

interface TimecardRow {
  id: string;
  work_date: string;
  weekday: string;
  time_in: string | null;
  time_out: string | null;
  pay_code: string | null;
  hours: number | null;
  department: string | null;
}

interface PayCode {
  id: string;
  code: string;
  label: string;
  description: string;
  is_overtime: boolean;
  overtime_multiplier: number;
}

export default function BiWeeklyTimecard() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [timecardRows, setTimecardRows] = useState<TimecardRow[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Calculate bi-weekly period
  const anchorDate = searchParams.get('start') || format(new Date(), 'yyyy-MM-dd');
  const periodStart = format(startOfWeek(new Date(anchorDate), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const periodEnd = format(addDays(new Date(periodStart), 13), 'yyyy-MM-dd');

  // Fetch timecard data with auto-create  
  const { data: timecardData, isLoading, error, refetch } = useQuery({
    queryKey: ['timecard', employeeId, periodStart, periodEnd],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        `get-biweekly-timecard?employeeId=${employeeId}&periodStart=${periodStart}&periodEnd=${periodEnd}&createIfMissing=true`
      );

      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Fetch pay codes for dropdown
  const { data: payCodesData } = useQuery({
    queryKey: ['payCodes', employeeId],
    queryFn: async () => {
      if (!employeeId) return { payCodes: [] };
      
      const { data, error } = await supabase.functions.invoke(
        `get-timesheet-pay-codes?employeeId=${employeeId}`
      );

      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  // Initialize timecard rows
  useEffect(() => {
    if (timecardData?.timecard) {
      setTimecardRows(timecardData.timecard);
    }
  }, [timecardData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('save-timecard', {
        body: {
          timecardRows,
          employeeId,
          periodStart,
          periodEnd,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setLastSaved(new Date(data.savedAt));
      queryClient.invalidateQueries({ queryKey: ['timecard', employeeId, periodStart] });
      toast({
        title: "Saved",
        description: "Timecard saved successfully",
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
      const totals = calculateTotals();
      const { error } = await supabase.rpc('approve_timesheet_supervisor', {
        p_employee_id: employeeId,
        p_start_date: periodStart,
        p_end_date: periodEnd,
        p_selected_days: timecardRows.map(r => r.work_date),
        p_approval_note: 'Supervisor approved',
        p_totals: totals,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timecard', employeeId, periodStart] });
      toast({
        title: "Supervisor Approved",
        description: "Timecard approved by supervisor",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve",
        variant: "destructive",
      });
    },
  });

  // HR final approval
  const hrApproveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('approve_timesheet_final', {
        p_employee_id: employeeId,
        p_start_date: periodStart,
        p_end_date: periodEnd,
        p_approval_note: 'HR final approved',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timecard', employeeId, periodStart] });
      toast({
        title: "Final Approved",
        description: "Timecard finalized and locked. Ready for payroll.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to finalize",
        variant: "destructive",
      });
    },
  });

  // Unlock mutation (admin only)
  const unlockMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('unlock_timesheet', {
        p_employee_id: employeeId,
        p_start_date: periodStart,
        p_end_date: periodEnd,
        p_unlock_reason: 'Admin unlock for corrections',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timecard', employeeId, periodStart] });
      toast({
        title: "Unlocked",
        description: "Timecard unlocked for editing",
      });
    },
  });

  const updateRow = (index: number, field: keyof TimecardRow, value: any) => {
    const updated = [...timecardRows];
    updated[index] = { ...updated[index], [field]: value };
    setTimecardRows(updated);
  };

  const calculateTotals = () => {
    const totals = { reg: 0, ot: 0, ot1: 0, ot2: 0, stat: 0, vac: 0, sick: 0 };
    timecardRows.forEach(row => {
      const hours = parseFloat(row.hours?.toString() || '0');
      const code = row.pay_code?.toLowerCase() || '';
      
      if (code.includes('reg')) totals.reg += hours;
      else if (code === 'ot') totals.ot += hours;
      else if (code === 'ot1') totals.ot1 += hours;
      else if (code === 'ot2') totals.ot2 += hours;
      else if (code.includes('stat')) totals.stat += hours;
      else if (code.includes('vac')) totals.vac += hours;
      else if (code.includes('sick')) totals.sick += hours;
    });
    return totals;
  };

  const isLocked = timecardData?.approval?.is_locked;
  const approvalStage = timecardData?.approval?.approval_stage || 'pending';
  const isAdmin = profile?.role === 'org_admin' || profile?.role === 'payroll_admin';
  const canSupervise = profile?.role === 'manager' || isAdmin;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load timecard. {error.message}
            <Button onClick={() => refetch()} className="ml-4" variant="outline" size="sm">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div key={`${employeeId}-${periodStart}`} className="container mx-auto p-6 space-y-6">
        <PageHeader
          title="Bi-Weekly Timecard"
          description={`${timecardData?.employee?.company_code || ''} - ${format(new Date(periodStart), 'MMM dd')}–${format(new Date(periodEnd), 'MMM dd, yyyy')}`}
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/timesheets')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1 text-xs">
                      <p><strong>Employee:</strong> {employeeId}</p>
                      <p><strong>Company:</strong> {timecardData?.employee?.company_code}</p>
                      <p><strong>Period:</strong> {periodStart} to {periodEnd}</p>
                      <p><strong>Rows:</strong> {timecardRows.length}</p>
                      <p><strong>Status:</strong> {approvalStage}</p>
                      {lastSaved && <p><strong>Last Saved:</strong> {format(lastSaved, 'HH:mm:ss')}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Timesheet Entries</CardTitle>
              <div className="flex items-center gap-2">
                {isLocked && (
                  <Badge variant="secondary">
                    <Lock className="mr-1 h-3 w-3" />
                    Locked
                  </Badge>
                )}
                <Badge variant={approvalStage === 'final_approved' ? 'default' : 'secondary'}>
                  {approvalStage === 'supervisor_approved' ? 'Approved (Supervisor)' :
                   approvalStage === 'final_approved' ? 'Final Approved' : 'Pending'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(!payCodesData?.payCodes || payCodesData.payCodes.length === 0) && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No pay codes mapped to company {timecardData?.employee?.company_code}
                </AlertDescription>
              </Alert>
            )}

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
                  {timecardRows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.hours && row.hours > 0 && <Check className="h-4 w-4 text-green-600" />}
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
                          disabled={isLocked}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue placeholder="Select code" />
                          </SelectTrigger>
                          <SelectContent>
                            {payCodesData?.payCodes?.map((pc: PayCode) => (
                              <SelectItem key={pc.id} value={pc.code}>
                                {pc.code} - {pc.label}
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
                        {row.hours ? parseFloat(row.hours.toString()).toFixed(2) : '0.00'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="flex gap-4">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={isLocked || saveMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>

                {canSupervise && approvalStage === 'pending' && (
                  <Button
                    onClick={() => supervisorApproveMutation.mutate()}
                    disabled={supervisorApproveMutation.isPending || !lastSaved}
                    variant="secondary"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Supervisor Approve
                  </Button>
                )}

                {isAdmin && approvalStage === 'supervisor_approved' && (
                  <Button
                    onClick={() => hrApproveMutation.mutate()}
                    disabled={hrApproveMutation.isPending}
                    variant="default"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    HR Final Approve
                  </Button>
                )}

                {isAdmin && isLocked && (
                  <Button
                    onClick={() => unlockMutation.mutate()}
                    variant="outline"
                  >
                    <Unlock className="mr-2 h-4 w-4" />
                    Unlock (Admin)
                  </Button>
                )}
              </div>

              <div className="text-right text-sm text-muted-foreground">
                {lastSaved && `Last saved: ${format(lastSaved, 'HH:mm:ss')}`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
