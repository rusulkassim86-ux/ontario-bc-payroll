import { useState, useEffect, useRef, useCallback } from "react";
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
import React from "react";
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
  manual_hours: number | null;
  daily_hours: number | null;
  source: 'manual' | 'punch' | 'hidden';
  department: string | null;
  approved: boolean;
}

// HoursCell component with local draft state and debounced save
interface HoursCellProps {
  value: number | null;
  workDate: string;
  payCode: string | null;
  disabled: boolean;
  onUpdate: (hours: number | null) => void;
  onSave: (workDate: string, hours: number | null, payCode: string | null) => Promise<any>;
}

function HoursCell({ value, workDate, payCode, disabled, onUpdate, onSave }: HoursCellProps) {
  const [draft, setDraft] = useState<string>(value !== null ? String(value) : '');
  const [isValid, setIsValid] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  // Sync with prop changes (server updates)
  useEffect(() => {
    setDraft(value !== null ? String(value) : '');
  }, [value]);

  const parseValue = (input: string): number | null => {
    const trimmed = input.trim();
    if (trimmed === '') return null;
    
    // Convert comma to dot for decimal
    const normalized = trimmed.replace(',', '.');
    const num = Number(normalized);
    
    if (isNaN(num)) return null;
    
    // Snap to quarter hours
    return Math.round(num * 4) / 4;
  };

  const validateValue = (num: number | null): boolean => {
    if (num === null) return true;
    return num >= 0 && num <= 24;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDraft = e.target.value;
    setDraft(newDraft);
    
    const parsed = parseValue(newDraft);
    const valid = validateValue(parsed);
    setIsValid(valid);
    
    if (valid) {
      onUpdate(parsed);
      
      // Debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await onSave(workDate, parsed, payCode);
        } catch (error: any) {
          toast({
            title: "Save Failed",
            description: error.message || "Failed to save hours",
            variant: "destructive",
          });
        }
      }, 400);
    }
  };

  const handleBlur = async () => {
    const parsed = parseValue(draft);
    const valid = validateValue(parsed);
    
    if (!valid) {
      // Revert to server value
      setDraft(value !== null ? String(value) : '');
      setIsValid(true);
      toast({
        title: "Invalid Hours",
        description: "Hours must be between 0 and 24",
        variant: "destructive",
      });
    } else if (parsed !== value) {
      // Save immediately on blur if different from server
      try {
        await onSave(workDate, parsed, payCode);
      } catch (error: any) {
        toast({
          title: "Save Failed",
          description: error.message || "Failed to save hours",
          variant: "destructive",
        });
        setDraft(value !== null ? String(value) : '');
      }
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      className={`w-24 ${!isValid ? 'border-destructive' : ''}`}
      placeholder="0.00"
      title="Type hours to override punches. Clear to use machine punches. Accepts comma or dot as decimal."
    />
  );
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

  // Get or create timecard using new edge function
  const { data: timecardData, isLoading, refetch } = useQuery({
    queryKey: ['timecard-v2', employeeId, periodStart, periodEnd],
    queryFn: async () => {
      if (!employeeData?.id) return null;
      
      const session = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = `${supabaseUrl}/functions/v1/get-timecard-v2?employeeId=${employeeData.id}&weekStart=${periodStart}&weekEnd=${periodEnd}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch timecard');
      }

      return await response.json();
    },
    enabled: !!employeeData?.id && !!periodStart,
    staleTime: 30_000,
  });

  // Initialize rows from server data
  useEffect(() => {
    if (timecardData?.days && Array.isArray(timecardData.days)) {
      const rows = timecardData.days.map((day: any) => ({
        id: day.work_date,
        work_date: day.work_date,
        weekday: format(new Date(day.work_date), 'EEEE'),
        time_in: day.time_in || null,
        time_out: day.time_out || null,
        pay_code: day.pay_code || null,
        hours: day.daily_hours || null,
        manual_hours: day.manual_hours || null,
        daily_hours: day.daily_hours || null,
        source: day.source || 'punch',
        department: employeeData?.home_department || null,
        approved: false,
      }));
      setTimecardRows(rows);
    }
  }, [timecardData, employeeData]);

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
        manual_hours: null,
        daily_hours: null,
        source: 'manual',
        department: employeeData?.home_department || null,
        approved: false,
      });
    }
    return rows;
  }

  const saveSingleEntry = useCallback(async (workDate: string, hours: number | null, payCode: string | null) => {
    if (!employeeData || !timecardData?.timecard?.id) return;

    const entry = {
      workDate,
      hours,
      payCode
    };

    try {
      const session = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = `${supabaseUrl}/functions/v1/save-timecard-v2`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId: timecardData.timecard.id,
          entries: [entry],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      const data = await response.json();
      
      // Update local state with server response
      if (data.days) {
        const updatedRows = timecardRows.map(row => {
          const serverDay = data.days.find((d: any) => d.work_date === row.work_date);
          if (serverDay) {
            return {
              ...row,
              daily_hours: serverDay.daily_hours,
              manual_hours: serverDay.manual_hours,
              source: serverDay.source,
              hours: serverDay.daily_hours,
            };
          }
          return row;
        });
        setTimecardRows(updatedRows);
      }

      return data;
    } catch (error: any) {
      if (error.message?.includes('pay calendar')) {
        toast({
          title: "Pay Calendar Missing",
          description: "No pay calendar was found for this date. Please contact your payroll administrator to create a pay calendar first.",
          variant: "destructive",
        });
      }
      throw error;
    }
  }, [employeeData, timecardData, timecardRows, toast]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!employeeData || !timecardData?.timecard?.id) throw new Error("Timecard not found");
      
      const entries = timecardRows
        .filter(row => row.hours && row.hours > 0)
        .map(row => ({
          workDate: row.work_date,
          hours: row.hours,
          payCode: row.pay_code,
          timeIn: row.time_in,
          timeOut: row.time_out
        }));

      if (entries.length === 0) {
        throw new Error("No hours entered to save");
      }

      const session = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = `${supabaseUrl}/functions/v1/save-timecard-v2`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timecardId: timecardData.timecard.id,
          entries,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save timecard');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      setLastSaved(new Date());
      
      if (data?.days) {
        const updatedRows = data.days.map((day: any) => ({
          id: day.work_date,
          work_date: day.work_date,
          weekday: format(new Date(day.work_date), 'EEEE'),
          time_in: day.time_in || null,
          time_out: day.time_out || null,
          pay_code: day.pay_code || null,
          hours: day.daily_hours || null,
          manual_hours: day.manual_hours || null,
          daily_hours: day.daily_hours || null,
          source: day.source || 'punch',
          department: employeeData?.home_department || null,
          approved: false,
        }));
        setTimecardRows(updatedRows);
      }

      toast({
        title: "Saved",
        description: `Timecard saved: ${data?.timecard?.total_hours || 0} total hours`,
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

  // Supervisor approval - saves first, then approves
  const supervisorApproveMutation = useMutation({
    mutationFn: async () => {
      if (!employeeData) throw new Error("Employee not found");
      
      // Step 1: Save draft first to ensure hours are in DB
      const entries = timecardRows
        .filter(row => row.hours && row.hours > 0)
        .map(row => ({
          work_date: row.work_date,
          hours: row.hours,
          pay_code: row.pay_code,
          time_in: row.time_in,
          time_out: row.time_out
        }));

      if (entries.length === 0) {
        throw new Error("Cannot approve timecard with zero hours");
      }

      // Save to database first
      const { data: saveData, error: saveError } = await supabase.rpc('save_timecard_draft', {
        p_employee_id: employeeData.id,
        p_entries: entries
      });

      if (saveError) throw saveError;
      
      const savedTotals = saveData as { success: boolean; entries_saved: number; totals: { reg: number; ot: number; stat: number; vac: number; sick: number; total: number } };

      // Step 2: Approve (function will recalculate totals from DB)
      const week1Start = new Date(periodStart);
      const week2End = new Date(periodEnd);

      const { data, error } = await supabase.rpc('approve_timesheet_supervisor', {
        p_employee_id: employeeData.id,
        p_start_date: week1Start.toISOString().split('T')[0],
        p_end_date: week2End.toISOString().split('T')[0],
        p_selected_days: timecardRows.filter(r => r.hours && r.hours > 0).map(r => r.work_date),
        p_approval_note: 'Supervisor approved via ADP timecard',
        p_totals: {} // Will be recalculated from DB server-side
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

  // HR final approval - function recalculates totals from DB
  const hrApproveMutation = useMutation({
    mutationFn: async () => {
      if (!employeeData) throw new Error("Employee not found");
      
      const week1Start = new Date(periodStart);
      const week2End = new Date(periodEnd);
      
      // Approval function will recalculate totals from database
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

  // Calculate total hours from all rows
  const totalHours = timecardRows.reduce((sum, row) => sum + (row.daily_hours || row.hours || 0), 0);
  const canApprove = totalHours > 0;

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
                  {isAdmin && <TableHead>Source</TableHead>}
                  <TableHead>Daily Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {week1Rows.map((row, index) => {
                  const hasManualHours = row.manual_hours !== null && row.manual_hours !== undefined;
                  return (
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
                        disabled={isLocked || hasManualHours}
                        className="w-32"
                        placeholder={hasManualHours ? "Manual" : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={row.time_out || ''}
                        onChange={(e) => updateRow(index, 'time_out', e.target.value)}
                        disabled={isLocked || hasManualHours}
                        className="w-32"
                        placeholder={hasManualHours ? "Manual" : ""}
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
                      <HoursCell
                        value={row.manual_hours}
                        workDate={row.work_date}
                        payCode={row.pay_code}
                        disabled={isLocked}
                        onUpdate={(hours) => {
                          updateRow(index, 'manual_hours', hours);
                          updateRow(index, 'hours', hours);
                          updateRow(index, 'source', hours === null ? 'punch' : 'manual');
                          
                          if (hours !== null) {
                            // Clear punch times when entering manual hours
                            updateRow(index, 'time_in', null);
                            updateRow(index, 'time_out', null);
                          }
                        }}
                        onSave={saveSingleEntry}
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
                    {isAdmin && row.source !== 'hidden' && (
                      <TableCell>
                        <Badge 
                          variant={row.source === 'manual' ? 'default' : 'secondary'}
                          className={row.source === 'manual' 
                            ? 'bg-[hsl(var(--badge-manual-bg))] text-[hsl(var(--badge-manual-fg))] text-xs px-2 py-1 rounded-full' 
                            : 'bg-[hsl(var(--badge-punch-bg))] text-[hsl(var(--badge-punch-fg))] text-xs px-2 py-1 rounded-full'}
                        >
                          {row.source === 'manual' ? 'Manual' : 'Machine'}
                        </Badge>
                      </TableCell>
                    )}
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
                  {isAdmin && <TableHead>Source</TableHead>}
                  <TableHead>Daily Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {week2Rows.map((row, index) => {
                  const actualIndex = index + 7;
                  const hasManualHours = row.manual_hours !== null && row.manual_hours !== undefined;
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
                          disabled={isLocked || hasManualHours}
                          className="w-32"
                          placeholder={hasManualHours ? "Manual" : ""}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={row.time_out || ''}
                          onChange={(e) => updateRow(actualIndex, 'time_out', e.target.value)}
                          disabled={isLocked || hasManualHours}
                          className="w-32"
                          placeholder={hasManualHours ? "Manual" : ""}
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
                      <HoursCell
                        value={row.manual_hours}
                        workDate={row.work_date}
                        payCode={row.pay_code}
                        disabled={isLocked}
                        onUpdate={(hours) => {
                          updateRow(actualIndex, 'manual_hours', hours);
                          updateRow(actualIndex, 'hours', hours);
                          updateRow(actualIndex, 'source', hours === null ? 'punch' : 'manual');
                          
                          if (hours !== null) {
                            // Clear punch times when entering manual hours
                            updateRow(actualIndex, 'time_in', null);
                            updateRow(actualIndex, 'time_out', null);
                          }
                        }}
                        onSave={saveSingleEntry}
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
                      {isAdmin && row.source !== 'hidden' && (
                        <TableCell>
                          <Badge 
                            variant={row.source === 'manual' ? 'default' : 'secondary'}
                            className={row.source === 'manual' 
                              ? 'bg-[hsl(var(--badge-manual-bg))] text-[hsl(var(--badge-manual-fg))] text-xs px-2 py-1 rounded-full' 
                              : 'bg-[hsl(var(--badge-punch-bg))] text-[hsl(var(--badge-punch-fg))] text-xs px-2 py-1 rounded-full'}
                          >
                            {row.source === 'manual' ? 'Manual' : 'Machine'}
                          </Badge>
                        </TableCell>
                      )}
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
                  disabled={supervisorApproveMutation.isPending || isLocked || !canApprove}
                  variant="secondary"
                  title={!canApprove ? "Cannot approve timecard with zero hours" : ""}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {supervisorApproveMutation.isPending ? 'Approving...' : 'Supervisor Approve'}
                </Button>
              )}

              {isAdmin && status === 'supervisor_approved' && (
                <Button
                  onClick={() => hrApproveMutation.mutate()}
                  disabled={hrApproveMutation.isPending || isLocked || !canApprove}
                  variant="default"
                  title={!canApprove ? "Cannot approve timecard with zero hours" : ""}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {hrApproveMutation.isPending ? 'Finalizing...' : 'HR Final Approve'}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-lg font-semibold">
                Total: {totalHours.toFixed(2)} hours
              </div>
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
