import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Download, Save, Check, ArrowLeft, Shield, CalendarIcon, ChevronLeft, ChevronRight, Info, FileText } from "lucide-react";
import { PayCodeSelector } from '@/components/payroll/PayCodeSelector';
import { PayCode } from '@/hooks/usePayCodes';
import { PayCodeUsageReport } from '@/components/payroll/PayCodeUsageReport';
import { usePayCodesMaster, PayCodeMaster } from '@/hooks/usePayCodesMaster';
import { ManualPunchDialog } from '@/components/punch/ManualPunchDialog';
import { usePunches } from '@/hooks/usePunches';
import { useDeviceMapping } from '@/hooks/useDeviceMapping';
import * as XLSX from 'xlsx';
import { format, addDays, startOfWeek, isSameDay, parseISO, subDays, isMonday, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/components/auth/AuthProvider';
import { usePayrollData } from '@/hooks/usePayrollData';
import { supabase } from '@/integrations/supabase/client';
import { useEmployeePayPeriod } from '@/hooks/usePayPeriods';
import { useEmployee } from '@/hooks/useEmployee';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import React from "react";

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
}

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  positionId: string;
  department: string;
  status: "Active" | "Inactive";
}

export default function IndividualTimecardMinimal() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Debug logging for route param verification
  console.info('[timecard] employeeId=', employeeId);
  
  // Fetch employee data using the new hook
  const { employee: employeeData, loading: employeeLoading, error: employeeError } = useEmployee(employeeId || '');
  const { employees, loading: employeesLoading } = usePayrollData();
  const { payPeriod, loading: payPeriodLoading } = useEmployeePayPeriod(employeeData?.id || '');
  const { mappings: deviceMappings, loading: mappingsLoading } = useDeviceMapping(employeeData?.id);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [autoExpanded, setAutoExpanded] = useState(false);
  const [payCodeMap, setPayCodeMap] = useState<Record<string, PayCode>>({});
  const [validatingEmployee, setValidatingEmployee] = useState(true);
  
  // Fetch pay codes from master table
  const { payCodes: masterPayCodes, loading: payCodesLoading } = usePayCodesMaster();

  // Calculate bi-weekly period based on company pay period settings
  const calculateBiWeeklyPeriod = (providedStart?: string, providedEnd?: string) => {
    if (providedStart && providedEnd) {
      const start = new Date(providedStart);
      const end = new Date(providedEnd);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 6) { // 7-day period, expand to 14
        setAutoExpanded(true);
        const expandedEnd = addDays(start, 13);
        return { start, end: expandedEnd };
      }
      
      return { start, end };
    }

    // Use company pay period settings if available
    if (payPeriod?.anchor_date) {
      const anchor = new Date(payPeriod.anchor_date);
      const today = new Date();
      
      // Calculate how many 14-day periods have passed since anchor
      const daysDiff = Math.floor((today.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
      const periodsPassed = Math.floor(daysDiff / 14);
      
      // Calculate current period start
      const currentPeriodStart = addDays(anchor, periodsPassed * 14);
      
      return {
        start: currentPeriodStart,
        end: addDays(currentPeriodStart, 13),
      };
    }

    // Fallback: Find most recent Monday (anchor)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Calculate days back to Monday
    const anchor = subDays(today, daysToMonday);
    
    return {
      start: anchor,
      end: addDays(anchor, 13), // 14 days total
    };
  };

  const initializeDates = () => {
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    return calculateBiWeeklyPeriod(startParam || undefined, endParam || undefined);
  };

  const [selectedPeriod, setSelectedPeriod] = useState("current-pay-period");
  const [periodDates, setPeriodDates] = useState(initializeDates());
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [activeTab, setActiveTab] = useState("timecard");

  // Validate employee ID and handle invalid IDs
  useEffect(() => {
    if (!employeeId || employeeId.trim() === "") {
      toast({
        variant: "destructive",
        title: "Employee Not Found",
        description: "Employee ID is missing from the URL",
      });
      navigate("/timesheets");
      return;
    }

    // Handle employee loading and errors
    if (employeeError && !employeeLoading) {
      toast({
        variant: "destructive",
        title: "Employee Not Found",
        description: `Employee with ID "${employeeId}" was not found`,
      });
      navigate("/timesheets");
      return;
    }

    // Log successful validation
    if (employeeData) {
      console.log("✅ Valid Employee found:", employeeData);
    }

    setValidatingEmployee(false);
  }, [employeeId, employeeData, employeeError, employeeLoading, navigate, toast]);

  // Show auto-expand toast
  useEffect(() => {
    if (autoExpanded) {
      toast({
        title: "Pay period adjusted to bi-weekly",
        description: "The 7-day period has been expanded to the full 14-day pay period.",
        duration: 4000,
      });
      setAutoExpanded(false);
    }
  }, [autoExpanded, toast]);

  // Update URL when dates change
  useEffect(() => {
    setSearchParams({
      start: format(periodDates.start, 'yyyy-MM-dd'),
      end: format(periodDates.end, 'yyyy-MM-dd')
    });
  }, [periodDates, setSearchParams]);

  // Use real employee data or fallback to mock data
  const employee: Employee = employeeData ? {
    id: employeeData.id,
    name: `${employeeData.first_name} ${employeeData.last_name}`,
    employeeId: employeeData.employee_number,
    positionId: employeeData.classification || "GENERAL_LABOR",
    department: "Operations",
    status: employeeData.status as "Active" | "Inactive"
  } : {
    id: "1",
    name: `Employee ${employeeId}`,
    employeeId: employeeId || "EMP001",
    positionId: "GENERAL_LABOR",
    department: "Operations",
    status: "Active"
  };

  // Generate mock timecard entries for bi-weekly period (14 days)
  const generateBiWeeklyEntries = () => {
    const entries: TimecardEntry[] = [];
    const periodLength = differenceInDays(periodDates.end, periodDates.start) + 1;
    
    for (let i = 0; i < periodLength; i++) {
      const date = addDays(periodDates.start, i);
      const weekday = format(date, 'EEE');
      
      // Skip weekends for regular entries, but include them as empty rows
      const isWeekend = weekday === 'Sat' || weekday === 'Sun';
      
      entries.push({
        id: `day-${i}`,
        date,
        weekday,
        timeIn: isWeekend ? "" : "08:00",
        timeOut: isWeekend ? "" : "17:00", 
        payCode: "REG",
        hours: isWeekend ? 0 : 8.0,
        department: "0000700",
        approved: false
      });
    }
    
    return entries;
  };

  const [entries, setEntries] = useState<TimecardEntry[]>(generateBiWeeklyEntries());
  
  // Add punch integration
  const { punches, punchPairs, loading: punchesLoading, addManualPunch, deletePunch } = usePunches(
    employeeId,
    periodDates.start,
    periodDates.end
  );

  // Merge punch data with timecard entries
  const mergeEntriesWithPunches = (timecardEntries: TimecardEntry[]): TimecardEntry[] => {
    return timecardEntries.map(entry => {
      const dateStr = format(entry.date, 'yyyy-MM-dd');
      const punchPair = punchPairs.find(pair => pair.date === dateStr);
      
      if (punchPair) {
        return {
          ...entry,
          timeIn: punchPair.timeIn || entry.timeIn,
          timeOut: punchPair.timeOut || entry.timeOut,
          hours: punchPair.hours || entry.hours,
          // Mark as complete if we have both in and out punches
          approved: punchPair.isComplete ? entry.approved : false
        };
      }
      
      return entry;
    });
  };

  // Regenerate entries when period changes and merge with punch data
  useEffect(() => {
    const baseEntries = generateBiWeeklyEntries();
    const mergedEntries = mergeEntriesWithPunches(baseEntries);
    setEntries(mergedEntries);
  }, [periodDates, punchPairs]);

  // Period navigation functions
  const navigateToPreviousPeriod = () => {
    const newStart = subDays(periodDates.start, 14);
    const newEnd = addDays(newStart, 13);
    setPeriodDates({ start: newStart, end: newEnd });
  };

  const navigateToNextPeriod = () => {
    const newStart = addDays(periodDates.start, 14);
    const newEnd = addDays(newStart, 13);
    setPeriodDates({ start: newStart, end: newEnd });
  };

  // Format period label with week breakdown
  const getPeriodLabel = () => {
    const periodLength = differenceInDays(periodDates.end, periodDates.start) + 1;
    const startLabel = format(periodDates.start, 'EEE MMM dd');
    const endLabel = format(periodDates.end, 'EEE MMM dd, yyyy');
    
    if (periodLength === 14) {
      const week1End = addDays(periodDates.start, 6);
      const week2Start = addDays(periodDates.start, 7);
      
      return {
        main: `${startLabel} – ${endLabel} (14 days)`,
        subtitle: `Bi-weekly • Week 1 (${format(periodDates.start, 'EEE')}–${format(week1End, 'EEE')}), Week 2 (${format(week2Start, 'EEE')}–${format(periodDates.end, 'EEE')})`
      };
    }
    
    return {
      main: `${startLabel} – ${endLabel} (${periodLength} days)`,
      subtitle: periodLength === 7 ? 'Weekly period' : 'Custom date range'
    };
  };

  // Get active pay codes for dropdown (filter for Earnings, Overtime, and Leave types)
  const payCodeOptions = masterPayCodes
    .filter(pc => pc.is_active && ['Earnings', 'Overtime', 'Leave'].includes(pc.type))
    .map(pc => pc.code);
  
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

  // Calculate totals with proper daily and weekly OT rules
  const calculateTotalsWithOT = () => {
    const periodLength = differenceInDays(periodDates.end, periodDates.start) + 1;
    const is14DayPeriod = periodLength === 14;
    
    // Company policy settings (should come from pay period settings)
    const dailyRegularLimit = 8; // hours before daily OT kicks in
    const weeklyRegularLimit = 40; // hours before weekly OT kicks in
    
    const processedEntries = entries.map((entry, index) => {
      let dailyReg = 0;
      let dailyOT = 0;
      
      if (entry.payCode === 'REG' && entry.hours > 0) {
        if (entry.hours <= dailyRegularLimit) {
          dailyReg = entry.hours;
        } else {
          dailyReg = dailyRegularLimit;
          dailyOT = entry.hours - dailyRegularLimit;
        }
      } else if (entry.payCode === 'REG') {
        dailyReg = entry.hours;
      }
      
      return {
        ...entry,
        calculatedReg: entry.payCode === 'REG' ? dailyReg : 0,
        calculatedDailyOT: entry.payCode === 'REG' ? dailyOT : 0,
        calculatedOther: entry.payCode !== 'REG' ? entry.hours : 0
      };
    });

    // Calculate weekly totals and weekly OT
    const weeklyTotals = [];
    if (is14DayPeriod) {
      // Week 1 (days 0-6)
      const week1Entries = processedEntries.slice(0, 7);
      const week1RegHours = week1Entries.reduce((sum, e) => sum + e.calculatedReg, 0);
      const week1DailyOT = week1Entries.reduce((sum, e) => sum + e.calculatedDailyOT, 0);
      const week1WeeklyOT = Math.max(0, week1RegHours - weeklyRegularLimit);
      const week1FinalReg = week1RegHours - week1WeeklyOT;

      weeklyTotals.push({
        week: 1,
        reg: week1FinalReg,
        dailyOT: week1DailyOT,
        weeklyOT: week1WeeklyOT,
        stat: week1Entries.reduce((sum, e) => sum + (e.payCode === 'STAT' ? e.hours : 0), 0),
        vac: week1Entries.reduce((sum, e) => sum + (e.payCode === 'VAC' ? e.hours : 0), 0),
        sick: week1Entries.reduce((sum, e) => sum + (e.payCode === 'SICK' ? e.hours : 0), 0),
      });

      // Week 2 (days 7-13)
      const week2Entries = processedEntries.slice(7, 14);
      const week2RegHours = week2Entries.reduce((sum, e) => sum + e.calculatedReg, 0);
      const week2DailyOT = week2Entries.reduce((sum, e) => sum + e.calculatedDailyOT, 0);
      const week2WeeklyOT = Math.max(0, week2RegHours - weeklyRegularLimit);
      const week2FinalReg = week2RegHours - week2WeeklyOT;

      weeklyTotals.push({
        week: 2,
        reg: week2FinalReg,
        dailyOT: week2DailyOT,
        weeklyOT: week2WeeklyOT,
        stat: week2Entries.reduce((sum, e) => sum + (e.payCode === 'STAT' ? e.hours : 0), 0),
        vac: week2Entries.reduce((sum, e) => sum + (e.payCode === 'VAC' ? e.hours : 0), 0),
        sick: week2Entries.reduce((sum, e) => sum + (e.payCode === 'SICK' ? e.hours : 0), 0),
      });
    }

    // Period totals
    const periodTotals = {
      reg: weeklyTotals.reduce((sum, w) => sum + w.reg, 0) || processedEntries.reduce((sum, e) => sum + e.calculatedReg, 0),
      dailyOT: weeklyTotals.reduce((sum, w) => sum + w.dailyOT, 0) || processedEntries.reduce((sum, e) => sum + e.calculatedDailyOT, 0),
      weeklyOT: weeklyTotals.reduce((sum, w) => sum + w.weeklyOT, 0),
      stat: processedEntries.reduce((sum, e) => sum + (e.payCode === 'STAT' ? e.hours : 0), 0),
      vac: processedEntries.reduce((sum, e) => sum + (e.payCode === 'VAC' ? e.hours : 0), 0),
      sick: processedEntries.reduce((sum, e) => sum + (e.payCode === 'SICK' ? e.hours : 0), 0),
    };

    return {
      is14DayPeriod,
      weeklyTotals,
      periodTotals,
      processedEntries
    };
  };

  const handleApproveTimecard = () => {
    toast({
      title: "Timecard Approved",
      description: `Timecard for ${employee.name} has been approved.`,
    });
  };

  const handleSave = async () => {
    if (!employeeData?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Employee ID is missing",
      });
      return;
    }

    // Get or create pay_calendar_id
    let calendarId = payPeriod?.id;
    if (!calendarId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Pay calendar not configured for this employee",
      });
      return;
    }

    try {
      // Prepare timesheet data for saving
      const timesheetData = entries.map(entry => ({
        employee_id: employeeData.id,
        pay_calendar_id: calendarId,
        work_date: format(entry.date, 'yyyy-MM-dd'),
        hours_regular: entry.payCode === 'REG' ? entry.hours : 0,
        hours_ot1: entry.payCode === 'OT' || entry.payCode === 'OT1' ? entry.hours : 0,
        hours_ot2: entry.payCode === 'OT2' ? entry.hours : 0,
        hours_stat: entry.payCode === 'STAT' ? entry.hours : 0,
        status: 'submitted',
        pay_period_start: format(periodDates.start, 'yyyy-MM-dd'),
        pay_period_end: format(periodDates.end, 'yyyy-MM-dd'),
      }));

      // Filter out empty entries (no hours)
      const validEntries = timesheetData.filter(entry => 
        entry.hours_regular > 0 || 
        entry.hours_ot1 > 0 || 
        entry.hours_ot2 > 0 || 
        entry.hours_stat > 0
      );

      if (validEntries.length === 0) {
        toast({
          variant: "destructive",
          title: "No Data to Save",
          description: "Please enter hours before saving",
        });
        return;
      }

      // Upsert timesheet data
      const { error } = await supabase
        .from('timesheets')
        .upsert(validEntries, {
          onConflict: 'employee_id,work_date',
          ignoreDuplicates: false
        });

      if (error) throw error;

      toast({
        title: "Timecard Saved",
        description: `Successfully saved ${validEntries.length} timesheet entries`,
      });
    } catch (error) {
      console.error('Error saving timesheet:', error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save timesheet",
      });
    }
  };

  const handleExportPDF = () => {
    toast({
      title: "PDF Export",
      description: "Generating timecard PDF with week groupings...",
    });
  };

  const exportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const worksheetData: any[][] = [];

      // Header row
      worksheetData.push([
        'Approve',
        'Weekday', 
        'Date',
        'In',
        'Out',
        'Pay Code',
        'Hours',
        'Department',
        'Daily Totals'
      ]);

      // Process each week
      for (let weekNumber = 1; weekNumber <= 2; weekNumber++) {
        // Week header
        worksheetData.push([`Week ${weekNumber}`, '', '', '', '', '', '', '', '']);
        
        // Week data
        const weekData = entries.filter((entry, index) => {
          return weekNumber === 1 ? index < 7 : index >= 7;
        });

        weekData.forEach((entry, entryIndex) => {
          const globalIndex = weekNumber === 1 ? entryIndex : entryIndex + 7;
          const processedEntry = totalsData.processedEntries[globalIndex];
          const dailyTotal = processedEntry.calculatedReg + processedEntry.calculatedDailyOT + processedEntry.calculatedOther;
          
          worksheetData.push([
            entry.approved ? 'Yes' : 'No',
            entry.weekday,
            format(entry.date, 'yyyy-MM-dd'),
            entry.timeIn || '',
            entry.timeOut || '',
            entry.payCode,
            entry.hours.toFixed(2),
            entry.department,
            dailyTotal.toFixed(2)
          ]);
        });

        // Weekly totals
        const wt = totalsData.weeklyTotals[weekNumber - 1];
        const weeklyTotal = wt.reg + wt.dailyOT + wt.weeklyOT + wt.stat + wt.vac + wt.sick;
        
        worksheetData.push([
          'WEEKLY TOTALS',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          `REG: ${wt.reg.toFixed(2)} | Daily OT: ${wt.dailyOT.toFixed(2)} | Weekly OT: ${wt.weeklyOT.toFixed(2)} | STAT: ${wt.stat.toFixed(2)} | VAC: ${wt.vac.toFixed(2)} | SICK: ${wt.sick.toFixed(2)} | Total: ${weeklyTotal.toFixed(2)}`
        ]);

        // Add spacing between weeks
        if (weekNumber === 1) {
          worksheetData.push(['', '', '', '', '', '', '', '', '']);
        }
      }

      // Period totals
      const pt = totalsData.periodTotals;
      const periodTotal = pt.reg + pt.dailyOT + pt.weeklyOT + pt.stat + pt.vac + pt.sick;
      
      worksheetData.push(['', '', '', '', '', '', '', '', '']);
      worksheetData.push([
        'PERIOD TOTALS',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        `REG: ${pt.reg.toFixed(2)} | Daily OT: ${pt.dailyOT.toFixed(2)} | Weekly OT: ${pt.weeklyOT.toFixed(2)} | STAT: ${pt.stat.toFixed(2)} | VAC: ${pt.vac.toFixed(2)} | SICK: ${pt.sick.toFixed(2)} | Total: ${periodTotal.toFixed(2)}`
      ]);

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Apply styling
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // Header row styling
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!worksheet[cellAddress]) continue;
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'D3D3D3' } },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
      }

      // Set column widths
      worksheet['!cols'] = [
        { width: 10 }, // Approve
        { width: 12 }, // Weekday
        { width: 12 }, // Date
        { width: 12 }, // In
        { width: 12 }, // Out
        { width: 12 }, // Pay Code
        { width: 10 }, // Hours
        { width: 15 }, // Department
        { width: 25 }  // Daily Totals
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Timecard');

      // Generate filename
      const startDate = format(periodDates.start, 'yyyy-MM-dd');
      const endDate = format(periodDates.end, 'yyyy-MM-dd');
      const filename = `timecard_${employeeId}_${startDate}_${endDate}.xlsx`;

      // Export file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Excel exported",
        description: `Timecard exported as ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const totalsData = calculateTotalsWithOT();
  const periodLabel = getPeriodLabel();

  // Show loading or redirect for invalid employee
  if (validatingEmployee || employeeLoading || punchesLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Individual Timecard" description="Loading employee data..." />
        <div className="flex justify-center p-8">
          <div className="text-muted-foreground">
            Loading timecard data
            {punchesLoading && " and punch records"}
            ...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate("/timesheets")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{employee.name}</h1>
              <p className="text-sm text-muted-foreground">
                ID: {employee.employeeId} • {employee.department} • {employee.status}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel}>
              <FileText className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button size="sm" className="bg-success text-success-foreground" onClick={handleApproveTimecard}>
              <Check className="h-4 w-4 mr-2" />
              Approve Timecard
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Employee Header Section */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-primary-foreground">
                  {periodLabel.main}
                </h2>
                <p className="text-sm text-primary-foreground/80">
                  {periodLabel.subtitle}
                </p>
                <p className="text-sm text-primary-foreground/80">
                  Employee {employee.employeeId} • {employee.positionId} • {employee.department}
                </p>
              </div>

              {/* Period Navigation */}
              <div className="flex items-center gap-1 bg-primary-foreground/10 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={navigateToPreviousPeriod}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="px-3 py-2 text-sm font-medium text-primary-foreground min-w-[200px] text-center">
                  {periodLabel.main}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={navigateToNextPeriod}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Employee Name</p>
                <p className="font-semibold">{employee.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Position ID</p>
                <p className="font-semibold">{employee.positionId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-semibold">{employee.department}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={employee.status === "Active" ? "default" : "secondary"}>
                  {employee.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Period Controls */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div>
                <Label>Time Period</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="current-pay-period">Current Pay Period</SelectItem>
                    <SelectItem value="previous-pay-period">Previous Pay Period</SelectItem>
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
                        !periodDates.start && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(periodDates.start, "MM/dd/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={periodDates.start}
                      onSelect={(date) => {
                        if (date) {
                          const newPeriod = calculateBiWeeklyPeriod(format(date, 'yyyy-MM-dd'), format(addDays(date, 13), 'yyyy-MM-dd'));
                          setPeriodDates(newPeriod);
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
                        !periodDates.end && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(periodDates.end, "MM/dd/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={periodDates.end}
                      onSelect={(date) => {
                        if (date) {
                          const newPeriod = calculateBiWeeklyPeriod(format(subDays(date, 13), 'yyyy-MM-dd'), format(date, 'yyyy-MM-dd'));
                          setPeriodDates(newPeriod);
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
                  <TabsTrigger value="usage-report" className="px-6">Pay Code Usage</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="timecard" className="m-0">
                <TooltipProvider>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[80px] text-center">Approve</TableHead>
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
                        {entries.map((entry, index) => {
                          const isWeekend = entry.weekday === 'Sat' || entry.weekday === 'Sun';
                          const shouldShowWeekHeader = totalsData.is14DayPeriod && (index === 0 || index === 7);
                          const shouldShowWeeklyTotals = totalsData.is14DayPeriod && (index === 6 || index === 13);
                          const weekNumber = Math.floor(index / 7) + 1;

                          return (
                            <React.Fragment key={entry.id}>
                              {/* Week Header */}
                              {shouldShowWeekHeader && (
                                <TableRow className="bg-primary/5 sticky top-0 z-10 border-primary/20">
                                  <TableCell colSpan={9} className="py-3 font-semibold text-primary">
                                    <div className="flex items-center gap-2">
                                      <span>Week {weekNumber}</span>
                                      <span className="text-sm font-normal text-muted-foreground">
                                        ({format(addDays(periodDates.start, (weekNumber - 1) * 7), 'MMM dd')} - {format(addDays(periodDates.start, weekNumber * 7 - 1), 'MMM dd')})
                                      </span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}

                              {/* Daily Row */}
                              <TableRow className={cn(
                                "border-b",
                                isWeekend && "bg-muted/30",
                                entry.approved && "bg-success/5"
                              )}>
                                <TableCell className="text-center">
                                  <Checkbox
                                    checked={entry.approved}
                                    onCheckedChange={(checked) => 
                                      updateEntry(entry.id, 'approved', checked)
                                    }
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {entry.weekday}
                                </TableCell>
                                <TableCell>
                                  {format(entry.date, 'MM/dd/yyyy')}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="time"
                                      value={entry.timeIn}
                                      onChange={(e) => updateEntry(entry.id, 'timeIn', e.target.value)}
                                      className="w-24"
                                    />
                                    {punchPairs.find(p => p.date === format(entry.date, 'yyyy-MM-dd'))?.timeIn && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Badge variant="outline" className="text-xs bg-success/10 text-success">
                                              P
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Punch data available
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="time"
                                      value={entry.timeOut}
                                      onChange={(e) => updateEntry(entry.id, 'timeOut', e.target.value)}
                                      className="w-24"
                                    />
                                    {punchPairs.find(p => p.date === format(entry.date, 'yyyy-MM-dd'))?.timeOut && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Badge variant="outline" className="text-xs bg-success/10 text-success">
                                              P
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Punch data available
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={entry.payCode}
                                    onValueChange={(value) => updateEntry(entry.id, 'payCode', value)}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue placeholder="Pay Code" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border shadow-lg z-50 max-h-[300px]">
                                      {payCodesLoading ? (
                                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                                      ) : payCodeOptions.length === 0 ? (
                                        <SelectItem value="none" disabled>No pay codes</SelectItem>
                                      ) : (
                                        payCodeOptions.map(code => {
                                          const payCodeDetails = masterPayCodes.find(pc => pc.code === code);
                                          return (
                                            <SelectItem key={code} value={code}>
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono">{code}</span>
                                                {payCodeDetails && (
                                                  <>
                                                    <span className="text-muted-foreground">•</span>
                                                    <span className="text-xs truncate max-w-[150px]">{payCodeDetails.description}</span>
                                                  </>
                                                )}
                                              </div>
                                            </SelectItem>
                                          );
                                        })
                                      )}
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
                                  >
                                    <SelectTrigger className="w-28">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border shadow-lg z-50">
                                      {departmentOptions.map(dept => (
                                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {entry.hours.toFixed(2)}
                                </TableCell>
                              </TableRow>

                              {/* Weekly Totals */}
                              {shouldShowWeeklyTotals && totalsData.weeklyTotals[weekNumber - 1] && (
                                <TableRow className="bg-primary/10 border-primary/30 font-semibold">
                                  <TableCell colSpan={6} className="text-right py-3">
                                    <div className="flex items-center justify-end gap-2">
                                      <span>Weekly Totals</span>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Info className="h-4 w-4 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Daily OT then Weekly OT (&gt;40h/week by policy)</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {(() => {
                                      const wt = totalsData.weeklyTotals[weekNumber - 1];
                                      const total = wt.reg + wt.dailyOT + wt.weeklyOT + wt.stat + wt.vac + wt.sick;
                                      return total.toFixed(2);
                                    })()}
                                  </TableCell>
                                  <TableCell></TableCell>
                                  <TableCell className="text-right font-mono">
                                    {(() => {
                                      const wt = totalsData.weeklyTotals[weekNumber - 1];
                                      const total = wt.reg + wt.dailyOT + wt.weeklyOT + wt.stat + wt.vac + wt.sick;
                                      return (
                                        <div className="text-xs space-y-1">
                                          <div>REG: {wt.reg.toFixed(2)}</div>
                                          {wt.dailyOT > 0 && <div>Daily OT: {wt.dailyOT.toFixed(2)}</div>}
                                          {wt.weeklyOT > 0 && <div>Weekly OT: {wt.weeklyOT.toFixed(2)}</div>}
                                          {wt.stat > 0 && <div>STAT: {wt.stat.toFixed(2)}</div>}
                                          {wt.vac > 0 && <div>VAC: {wt.vac.toFixed(2)}</div>}
                                          {wt.sick > 0 && <div>SICK: {wt.sick.toFixed(2)}</div>}
                                          <div className="border-t pt-1 font-bold">Total: {total.toFixed(2)}</div>
                                        </div>
                                      );
                                    })()}
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}

                        {/* Period Totals Footer */}
                        <TableRow className="bg-primary/20 border-primary font-bold">
                          <TableCell colSpan={6} className="text-right py-4">
                            Period Totals ({differenceInDays(periodDates.end, periodDates.start) + 1} days)
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(() => {
                              const pt = totalsData.periodTotals;
                              const total = pt.reg + pt.dailyOT + pt.weeklyOT + pt.stat + pt.vac + pt.sick;
                              return total.toFixed(2);
                            })()}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right font-mono">
                            {(() => {
                              const pt = totalsData.periodTotals;
                              const total = pt.reg + pt.dailyOT + pt.weeklyOT + pt.stat + pt.vac + pt.sick;
                              return (
                                <div className="text-xs space-y-1">
                                  <div>REG: {pt.reg.toFixed(2)}</div>
                                  {pt.dailyOT > 0 && <div>Daily OT: {pt.dailyOT.toFixed(2)}</div>}
                                  {pt.weeklyOT > 0 && <div>Weekly OT: {pt.weeklyOT.toFixed(2)}</div>}
                                  {pt.stat > 0 && <div>STAT: {pt.stat.toFixed(2)}</div>}
                                  {pt.vac > 0 && <div>VAC: {pt.vac.toFixed(2)}</div>}
                                  {pt.sick > 0 && <div>SICK: {pt.sick.toFixed(2)}</div>}
                                  <div className="border-t pt-1 font-bold">Total: {total.toFixed(2)}</div>
                                </div>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </TooltipProvider>
              </TabsContent>

              <TabsContent value="totals" className="p-6">
                <div className="text-center text-muted-foreground">
                  Totals view coming soon...
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="p-6">
                <div className="text-center text-muted-foreground">
                  Schedule view coming soon...
                </div>
              </TabsContent>

              <TabsContent value="supplemental" className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Supplemental Pay Codes</h3>
                    <p className="text-sm text-muted-foreground">
                      Premiums, banked time, deductions, and benefits available for this employee
                    </p>
                  </div>
                  <div className="grid gap-3">
                    {/* Mock supplemental pay codes - in real app, filter from usePayCodes */}
                    {[
                      { code: 'PREM', name: 'Premium Pay', category: 'premium', multiplier: 1.5 },
                      { code: 'BANK', name: 'Banked Time', category: 'bank', multiplier: 1.0 },
                      { code: 'UNION', name: 'Union Dues', category: 'deduction', amount: 45.00 },
                      { code: 'BENEFIT', name: 'Health Benefits', category: 'benefit', amount: 125.00 }
                    ].map((payCode) => (
                      <Card key={payCode.code} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold">{payCode.code}</span>
                              <Badge variant="outline">{payCode.category}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{payCode.name}</p>
                          </div>
                          <div className="text-right">
                            {payCode.multiplier && (
                              <div className="text-sm font-mono">{payCode.multiplier}x rate</div>
                            )}
                            {payCode.amount && (
                              <div className="text-sm font-mono">${payCode.amount}</div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="time-off" className="p-6">
                <div className="text-center text-muted-foreground">
                  Time off balances coming soon...
                </div>
              </TabsContent>

              <TabsContent value="usage-report" className="p-6">
                <PayCodeUsageReport />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}