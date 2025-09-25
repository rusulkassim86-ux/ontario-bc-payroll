import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Calendar, Download, Save, Check, ArrowLeft, Shield, CalendarIcon, AlertTriangle, Clock, CheckCircle2, Lock } from "lucide-react";
import { format, addDays, startOfWeek, isSameWeek, parseISO, subWeeks } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TimecardEntry {
  id: string;
  date: Date;
  weekday: string;
  timeIn: string;
  timeOut: string;
  payCode: string;
  hours: number;
  department: string;
  approved: boolean;
  selected: boolean;
}

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  positionId: string;
  taxId: string;
  status: "Active" | "Inactive";
  rehireDate: string;
}

interface ValidationIssue {
  rowIndex: number;
  date: string;
  issue: string;
}

interface PayPeriodTotals {
  reg: number;
  ot: number;
  stat: number;
  vac: number;
  sick: number;
  total: number;
}

interface ApprovalData {
  id?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalNote?: string;
  isLocked?: boolean;
}

export default function IndividualTimecard() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedPeriod, setSelectedPeriod] = useState("current-week");
  const [startDate, setStartDate] = useState(() => {
    const startParam = searchParams.get("start");
    return startParam ? parseISO(startParam) : startOfWeek(new Date(), { weekStartsOn: 1 });
  });
  const [endDate, setEndDate] = useState(() => {
    const endParam = searchParams.get("end");
    return endParam ? parseISO(endParam) : addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6);
  });
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [activeTab, setActiveTab] = useState("timecard");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [approvalData, setApprovalData] = useState<ApprovalData | null>(null);
  const [allSelected, setAllSelected] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  
  // Check user permissions on component mount
  useEffect(() => {
    const checkUserPermissions = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();
        
        const role = profile?.role;
        setUserRole(role);
        
        const viewRoles = ['org_admin', 'payroll_admin', 'manager', 'employee'];
        const approveRoles = ['org_admin', 'payroll_admin', 'manager'];
        
        setHasPermission(viewRoles.includes(role));
        setCanApprove(approveRoles.includes(role));
        
        if (!viewRoles.includes(role)) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to view timecards.",
            variant: "destructive",
          });
          navigate('/timesheets');
          return;
        }
        
        if (employeeId) {
          await loadEmployeeData(employeeId);
          await checkApprovalStatus(employeeId);
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        toast({
          title: "Error",
          description: "Failed to verify permissions.",
          variant: "destructive",
        });
        navigate('/timesheets');
      } finally {
        setLoading(false);
      }
    };
    
    checkUserPermissions();
  }, [employeeId, navigate, toast]);

  // Load employee data
  const loadEmployeeData = async (empId: string) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_number', empId)
        .single();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setEmployee({
          id: data.id,
          name: `${data.first_name} ${data.last_name}`,
          employeeId: data.employee_number,
          positionId: data.classification || 'N/A',
          taxId: data.sin_encrypted ? `XXX XXX ${data.employee_number.slice(-3)}` : 'XXX XXX ***',
          status: data.status === 'active' ? 'Active' : 'Inactive',
          rehireDate: format(new Date(data.hire_date), 'MMM dd, yyyy')
        });
      }
    } catch (error) {
      console.error('Error loading employee:', error);
      setEmployee(null);
    }
  };

  // Check approval status for the current period
  const checkApprovalStatus = async (empId: string) => {
    try {
      const { data } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_number', empId)
        .single();
      
      if (!data?.id) return;

      const { data: approval } = await supabase
        .from('timesheet_approvals')
        .select('id, approved_by, approved_at, approval_note')
        .eq('employee_id', data.id)
        .eq('pay_period_start', format(startDate, 'yyyy-MM-dd'))
        .eq('pay_period_end', format(endDate, 'yyyy-MM-dd'))
        .maybeSingle();

      if (approval) {
        // Get approver details separately
        const { data: approver } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', approval.approved_by)
          .single();

        setApprovalData({
          id: approval.id,
          approvedBy: approver ? 
            `${approver.first_name} ${approver.last_name}` : 
            'Unknown',
          approvedAt: approval.approved_at,
          approvalNote: approval.approval_note,
          isLocked: true
        });
      } else {
        setApprovalData(null);
      }
    } catch (error) {
      console.error('Error checking approval status:', error);
    }
  };

  // Update URL when date range changes
  const updateDateRange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
    setSearchParams({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    });
    
    // Re-check approval status when date range changes
    if (employeeId) {
      checkApprovalStatus(employeeId);
    }
  };

  // Handle period change
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const now = new Date();
    
    switch (period) {
      case 'current-week':
        const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
        updateDateRange(currentWeekStart, addDays(currentWeekStart, 6));
        break;
      case 'last-week':
        const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        updateDateRange(lastWeekStart, addDays(lastWeekStart, 6));
        break;
      case 'current-pay-period':
        // Assuming bi-weekly pay periods starting on Monday
        const payPeriodStart = startOfWeek(now, { weekStartsOn: 1 });
        updateDateRange(payPeriodStart, addDays(payPeriodStart, 13));
        break;
      default:
        // custom - don't change dates
        break;
    }
  };

  // Mock employee data fallback
  const getEmployeeFallback = (): Employee => ({
    id: "1",
    name: "John Smith",
    employeeId: employeeId || "EMP001",
    positionId: "GENERAL_LABOR",
    taxId: `XXX XXX ${(employeeId || "001").slice(-3)}`,
    status: "Active",
    rehireDate: "Jan 15, 2023"
  });

  // Mock timecard entries with selected field
  const [entries, setEntries] = useState<TimecardEntry[]>([
    {
      id: "1",
      date: new Date(),
      weekday: "Mon",
      timeIn: "08:00",
      timeOut: "17:00",
      payCode: "REG",
      hours: 8.0,
      department: "0000700",
      approved: false,
      selected: false
    },
    {
      id: "2",
      date: addDays(new Date(), 1),
      weekday: "Tue",
      timeIn: "08:00",
      timeOut: "17:00",
      payCode: "REG",
      hours: 8.0,
      department: "0000700",
      approved: false,
      selected: false
    }
  ]);

  const payCodeOptions = ["REG", "OT", "STAT", "VAC", "SICK"];
  const departmentOptions = ["0000700", "0000701", "0000702", "0000703"];

  const calculateHours = (timeIn: string, timeOut: string): number => {
    if (!timeIn || !timeOut) return 0;
    
    const [inHour, inMin] = timeIn.split(':').map(Number);
    const [outHour, outMin] = timeOut.split(':').map(Number);
    
    const inTime = inHour + inMin / 60;
    const outTime = outHour + outMin / 60;
    
    let hours = outTime - inTime;
    if (hours < 0) hours += 24; // Handle overnight shifts
    
    // Subtract 1 hour for lunch break if working more than 6 hours
    if (hours > 6) hours -= 1;
    
    return Math.round(hours * 100) / 100;
  };

  const updateEntry = (id: string, field: keyof TimecardEntry, value: any) => {
    setEntries(prev => prev.map(entry => {
      if (entry.id === id) {
        const updated = { ...entry, [field]: value };
        
        // Recalculate hours if time changed
        if (field === 'timeIn' || field === 'timeOut') {
          updated.hours = calculateHours(updated.timeIn, updated.timeOut);
        }
        
        return updated;
      }
      return entry;
    }));
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(startDate, i);
      days.push({
        date,
        weekday: format(date, 'EEE'),
        fullDate: format(date, 'MM/dd/yyyy')
      });
    }
    return days;
  };

  const getTotalsByPayCode = () => {
    const totals: Record<string, number> = {};
    entries.forEach(entry => {
      totals[entry.payCode] = (totals[entry.payCode] || 0) + entry.hours;
    });
    return totals;
  };

  const weekDays = getWeekDays();

  // Calculate totals by pay code
  const calculateTotals = useCallback((): PayPeriodTotals => {
    const totals = { reg: 0, ot: 0, stat: 0, vac: 0, sick: 0, total: 0 };
    
    entries.forEach(entry => {
      const code = entry.payCode.toUpperCase();
      switch (code) {
        case 'REG':
          totals.reg += entry.hours;
          break;
        case 'OT':
          totals.ot += entry.hours;
          break;
        case 'STAT':
          totals.stat += entry.hours;
          break;
        case 'VAC':
          totals.vac += entry.hours;
          break;
        case 'SICK':
          totals.sick += entry.hours;
          break;
      }
      totals.total += entry.hours;
    });
    
    return totals;
  }, [entries]);

  // Validate entries before approval
  const validateEntries = (): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const selectedEntries = entries.filter(entry => entry.selected);
    
    selectedEntries.forEach((entry, index) => {
      const dateStr = format(entry.date, 'MM/dd/yyyy');
      
      // Check for missing IN/OUT pairs
      if ((entry.timeIn && !entry.timeOut) || (!entry.timeIn && entry.timeOut)) {
        issues.push({
          rowIndex: index,
          date: dateStr,
          issue: 'Missing time in or time out'
        });
      }
      
      // Check for zero/negative hours with punches
      if (entry.timeIn && entry.timeOut && entry.hours <= 0) {
        issues.push({
          rowIndex: index,
          date: dateStr,
          issue: 'Hours are zero or negative with valid punches'
        });
      }
      
      // Check for unassigned pay code or department
      if (!entry.payCode || entry.payCode === '') {
        issues.push({
          rowIndex: index,
          date: dateStr,
          issue: 'Pay code not assigned'
        });
      }
      
      if (!entry.department || entry.department === '') {
        issues.push({
          rowIndex: index,
          date: dateStr,
          issue: 'Department not assigned'
        });
      }
    });
    
    return issues;
  };

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    setAllSelected(checked);
    setEntries(prev => prev.map(entry => ({ ...entry, selected: checked })));
  };

  // Handle individual row selection
  const handleRowSelect = (id: string, checked: boolean) => {
    setEntries(prev => prev.map(entry => 
      entry.id === id ? { ...entry, selected: checked } : entry
    ));
    
    // Update select all state
    const updatedEntries = entries.map(entry => 
      entry.id === id ? { ...entry, selected: checked } : entry
    );
    setAllSelected(updatedEntries.every(entry => entry.selected));
  };

  // Save timecard
  const handleSave = async () => {
    if (!canApprove || approvalData?.isLocked) return;
    
    setSaving(true);
    try {
      // Here you would save the timecard data to the database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Timecard Saved",
        description: "Your changes have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save timecard.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Start approval process
  const handleStartApproval = () => {
    if (!canApprove || approvalData?.isLocked) return;
    
    const selectedEntries = entries.filter(entry => entry.selected);
    if (selectedEntries.length === 0) {
      toast({
        title: "No Days Selected",
        description: "Please select at least one day to approve.",
        variant: "destructive",
      });
      return;
    }
    
    const issues = validateEntries();
    if (issues.length > 0) {
      setValidationIssues(issues);
      setShowValidationModal(true);
      return;
    }
    
    setShowApprovalModal(true);
  };

  // Execute approval
  const handleApproval = async () => {
    if (!employee?.id || !canApprove) return;
    
    setApproving(true);
    try {
      const selectedDays = entries
        .filter(entry => entry.selected)
        .map(entry => format(entry.date, 'yyyy-MM-dd'));
      
      const totals = calculateTotals();
      
      const { data, error } = await supabase.rpc('approve_timesheet', {
        p_employee_id: employee.id,
        p_start_date: format(startDate, 'yyyy-MM-dd'),
        p_end_date: format(endDate, 'yyyy-MM-dd'),
        p_selected_days: selectedDays,
        p_approval_note: approvalNote,
        p_totals: {
          reg: totals.reg,
          ot: totals.ot,
          stat: totals.stat,
          vac: totals.vac,
          sick: totals.sick
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Timecard Approved",
        description: `Timecard for ${employee.name} has been approved successfully.`,
      });
      
      // Refresh approval status
      await checkApprovalStatus(employeeId!);
      setShowApprovalModal(false);
      setApprovalNote("");
      
    } catch (error) {
      console.error('Error approving timecard:', error);
      toast({
        title: "Error",
        description: "Failed to approve timecard.",
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    try {
      const totals = calculateTotals();
      const filename = `timecard_${employeeId}_${format(startDate, 'yyyy-MM-dd')}_${format(endDate, 'yyyy-MM-dd')}.pdf`;
      
      // Here you would generate and download the PDF
      toast({
        title: "PDF Export",
        description: `Generating ${filename}...`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export PDF.",
        variant: "destructive",
      });
    }
  };

  const totalsByPayCode = getTotalsByPayCode();
  const periodTotals = calculateTotals();
  const isReadOnly = !canApprove || approvalData?.isLocked;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Individual Timecard" />
        <div className="p-6 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-32" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not found state
  if (!employee && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Employee Not Found" />
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">Employee Not Found</h3>
                  <p className="text-muted-foreground">
                    The employee with ID "{employeeId}" could not be found.
                  </p>
                </div>
                <Button onClick={() => navigate('/timesheets')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Timesheets
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const displayEmployee = employee || getEmployeeFallback();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Individual Timecard"
        description={approvalData?.isLocked ? `Approved by ${approvalData.approvedBy} on ${approvalData.approvedAt ? format(new Date(approvalData.approvedAt), 'MMM dd, yyyy') : ''}` : undefined}
        action={
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate("/timesheets")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Timesheets
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportPDF}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            {canApprove && !approvalData?.isLocked && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            )}
            {canApprove && !approvalData?.isLocked && (
              <Button 
                size="sm" 
                className="bg-success text-success-foreground" 
                onClick={handleStartApproval}
                disabled={approving}
              >
                <Check className="h-4 w-4 mr-2" />
                {approving ? 'Approving...' : 'Approve Timecard'}
              </Button>
            )}
            {approvalData?.isLocked && (
              <Badge variant="default" className="bg-success text-success-foreground">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approved
              </Badge>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Employee Header Section */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Employee Information
              {approvalData?.isLocked && (
                <Badge variant="secondary" className="ml-auto bg-white/20 text-white">
                  <Lock className="h-4 w-4 mr-1" />
                  Locked
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div>
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Employee Name</Label>
                <p className="font-semibold text-lg">{displayEmployee.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Employee ID</Label>
                <p className="font-semibold font-mono">{displayEmployee.employeeId}</p>
                <Label className="text-xs text-muted-foreground">Position: {displayEmployee.positionId}</Label>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Department</Label>
                <p className="font-semibold">Operations</p>
                <Label className="text-xs text-muted-foreground">Cost Center: 0000700</Label>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Hire Date</Label>
                <p className="font-semibold">{displayEmployee.rehireDate}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Status</Label>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={displayEmployee.status === "Active" ? "default" : "secondary"}
                    className="font-semibold"
                  >
                    {displayEmployee.status}
                  </Badge>
                  {approvalData?.isLocked && (
                    <Badge variant="outline" className="text-success border-success">
                      Approved
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Approval Details */}
            {approvalData?.isLocked && approvalData.approvalNote && (
              <div className="mt-6 p-4 bg-muted/30 rounded-lg border-l-4 border-success">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Approval Note</p>
                    <p className="text-sm text-muted-foreground mt-1">{approvalData.approvalNote}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Approved by {approvalData.approvedBy} on {format(new Date(approvalData.approvedAt!), 'PPpp')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Date Range Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="time-period">Time Period</Label>
                <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current-week">Current Week</SelectItem>
                    <SelectItem value="last-week">Last Week</SelectItem>
                    <SelectItem value="current-pay-period">Current Pay Period</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Start Date</Label>
                <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal w-[140px]",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(startDate, "MM/dd/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        if (date) {
                          updateDateRange(date, endDate);
                          setShowStartCalendar(false);
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label>End Date</Label>
                <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal w-[140px]",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(endDate, "MM/dd/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        if (date) {
                          updateDateRange(startDate, date);
                          setShowEndCalendar(false);
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <Button className="bg-primary">
                <Calendar className="h-4 w-4 mr-2" />
                Find
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Timecard Tabs */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b">
                <TabsList className="w-full justify-start rounded-none h-12 bg-muted/50">
                  <TabsTrigger value="timecard" className="px-6">Timecard</TabsTrigger>
                  <TabsTrigger value="totals" className="px-6">Totals</TabsTrigger>
                  <TabsTrigger value="schedule" className="px-6">Schedule</TabsTrigger>
                  <TabsTrigger value="supplemental" className="px-6">Supplemental Pay Codes</TabsTrigger>
                  <TabsTrigger value="time-off" className="px-6">Time Off Balances</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="timecard" className="m-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[80px] text-center">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={handleSelectAll}
                            disabled={isReadOnly}
                          />
                        </TableHead>
                        <TableHead className="w-[100px]">Weekday</TableHead>
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead className="w-[100px]">In</TableHead>
                        <TableHead className="w-[100px]">Out</TableHead>
                        <TableHead className="w-[120px]">Pay Code</TableHead>
                        <TableHead className="w-[100px] text-right">Hours</TableHead>
                        <TableHead className="w-[130px]">Department</TableHead>
                        <TableHead className="w-[120px] text-right">Daily Totals</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weekDays.map((day, index) => {
                        const dayEntries = entries.filter(entry => 
                          isSameWeek(entry.date, day.date) && 
                          format(entry.date, 'EEE') === day.weekday
                        );
                        
                        if (dayEntries.length === 0) {
                          dayEntries.push({
                            id: `new-${index}`,
                            date: day.date,
                            weekday: day.weekday,
                            timeIn: "",
                            timeOut: "",
                            payCode: "REG",
                            hours: 0,
                            department: "0000700",
                            approved: false,
                            selected: false
                          });
                        }

                        return dayEntries.map((entry, entryIndex) => {
                          const dailyTotal = dayEntries.reduce((sum, e) => sum + e.hours, 0);
                          const hasIssues = validationIssues.some(issue => 
                            format(entry.date, 'MM/dd/yyyy') === issue.date
                          );
                          
                          return (
                            <TableRow 
                              key={`${entry.id}-${entryIndex}`} 
                              className={cn(
                                "hover:bg-muted/20",
                                hasIssues && "bg-destructive/5 border-l-4 border-destructive",
                                entry.selected && "bg-primary/5 border-l-4 border-primary",
                                isReadOnly && "opacity-75"
                              )}
                            >
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={entry.selected}
                                  onCheckedChange={(checked) => 
                                    handleRowSelect(entry.id, checked as boolean)
                                  }
                                  disabled={isReadOnly}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{day.weekday}</TableCell>
                              <TableCell>{day.fullDate}</TableCell>
                              <TableCell>
                                <Input
                                  type="time"
                                  value={entry.timeIn}
                                  onChange={(e) => updateEntry(entry.id, 'timeIn', e.target.value)}
                                  className="w-full"
                                  disabled={isReadOnly}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="time"
                                  value={entry.timeOut}
                                  onChange={(e) => updateEntry(entry.id, 'timeOut', e.target.value)}
                                  className="w-full"
                                  disabled={isReadOnly}
                                />
                              </TableCell>
                              <TableCell>
                                <Select 
                                  value={entry.payCode}
                                  onValueChange={(value) => updateEntry(entry.id, 'payCode', value)}
                                  disabled={isReadOnly}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {payCodeOptions.map(code => (
                                      <SelectItem key={code} value={code}>{code}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {entry.hours.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Select 
                                  value={entry.department}
                                  onValueChange={(value) => updateEntry(entry.id, 'department', value)}
                                  disabled={isReadOnly}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {departmentOptions.map(dept => (
                                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">
                                {entryIndex === 0 ? dailyTotal.toFixed(2) : ''}
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="totals" className="m-0 p-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Pay Period Summary</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{periodTotals.reg.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">Regular Hours</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-warning">{periodTotals.ot.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">Overtime Hours</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-accent">{periodTotals.stat.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">Stat Holiday</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-success">{periodTotals.vac.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">Vacation</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-destructive">{periodTotals.sick.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">Sick Leave</p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold">{periodTotals.total.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">Total Hours</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-6 p-6 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-4">Period Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p className="font-medium">{format(startDate, 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">End Date</p>
                        <p className="font-medium">{format(endDate, 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Days Selected</p>
                        <p className="font-medium">{entries.filter(e => e.selected).length} of {entries.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-medium">{approvalData?.isLocked ? 'Approved' : 'Draft'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="m-0 p-6">
                <div className="text-center py-8 text-muted-foreground">
                  <h3 className="text-lg font-semibold mb-2">Schedule View</h3>
                  <p>Employee schedule information will be displayed here.</p>
                </div>
              </TabsContent>

              <TabsContent value="supplemental" className="m-0 p-6">
                <div className="text-center py-8 text-muted-foreground">
                  <h3 className="text-lg font-semibold mb-2">Supplemental Pay Codes</h3>
                  <p>Additional pay codes and adjustments will be displayed here.</p>
                </div>
              </TabsContent>

              <TabsContent value="time-off" className="m-0 p-6">
                <div className="text-center py-8 text-muted-foreground">
                  <h3 className="text-lg font-semibold mb-2">Time Off Balances</h3>
                  <p>Vacation, sick leave, and other time off balances will be displayed here.</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Approval Confirmation Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approve Timecard</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-3">Approval Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Regular</p>
                  <p className="font-bold">{periodTotals.reg.toFixed(2)} hrs</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Overtime</p>
                  <p className="font-bold">{periodTotals.ot.toFixed(2)} hrs</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Stat Holiday</p>
                  <p className="font-bold">{periodTotals.stat.toFixed(2)} hrs</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vacation</p>
                  <p className="font-bold">{periodTotals.vac.toFixed(2)} hrs</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sick</p>
                  <p className="font-bold">{periodTotals.sick.toFixed(2)} hrs</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Hours:</span>
                  <span className="font-bold text-lg">{periodTotals.total.toFixed(2)} hrs</span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="approval-note">Approval Note *</Label>
              <Textarea
                id="approval-note"
                placeholder="Enter a note for this approval..."
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p>• Selected days: {entries.filter(e => e.selected).length} of {entries.length}</p>
              <p>• Period: {format(startDate, 'MMM dd')} - {format(endDate, 'MMM dd, yyyy')}</p>
              <p>• Employee: {displayEmployee.name} ({displayEmployee.employeeId})</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApproval}
              disabled={!approvalNote.trim() || approving}
              className="bg-success text-success-foreground"
            >
              {approving ? 'Approving...' : 'Approve Timecard'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Issues Modal */}
      <AlertDialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Validation Issues Found
            </AlertDialogTitle>
            <AlertDialogDescription>
              The following issues must be resolved before approval:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-60 overflow-y-auto">
            <div className="space-y-2">
              {validationIssues.map((issue, index) => (
                <div key={index} className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{issue.date}</p>
                      <p className="text-sm text-muted-foreground">{issue.issue}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={() => setActiveTab('timecard')}>
              Go to Timecard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}