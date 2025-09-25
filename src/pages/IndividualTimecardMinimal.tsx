import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { Calendar, Download, Save, Check, ArrowLeft, Shield, CalendarIcon } from "lucide-react";
import { format, addDays, startOfWeek, isSameWeek, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  
  const [selectedPeriod, setSelectedPeriod] = useState("current-week");
  const [startDate, setStartDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6));
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [activeTab, setActiveTab] = useState("timecard");

  // Mock employee data based on employeeId
  const employee: Employee = {
    id: "1",
    name: "John Smith",
    employeeId: employeeId || "EMP001",
    positionId: "GENERAL_LABOR",
    department: "Operations",
    status: "Active"
  };

  // Mock timecard entries
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
      approved: false
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
      approved: false
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

  const handleApproveTimecard = () => {
    toast({
      title: "Timecard Approved",
      description: `Timecard for ${employee.name} has been approved.`,
    });
  };

  const handleSave = () => {
    toast({
      title: "Timecard Saved",
      description: "Your changes have been saved.",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "PDF Export",
      description: "Generating timecard PDF...",
    });
  };

  const weekDays = getWeekDays();
  const totalsByPayCode = getTotalsByPayCode();

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Individual Timecard"
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
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
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
        }
      />

      <div className="p-6 space-y-6">
        {/* Employee Header Section */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Employee Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div>
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Employee Name</Label>
                <p className="font-semibold text-lg">{employee.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Employee ID</Label>
                <p className="font-semibold font-mono">{employee.employeeId}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Position ID</Label>
                <p className="font-semibold">{employee.positionId}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Department</Label>
                <p className="font-semibold">{employee.department}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Status</Label>
                <Badge 
                  variant={employee.status === "Active" ? "default" : "secondary"}
                  className="mt-1 font-semibold"
                >
                  {employee.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Range Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="time-period">Time Period</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
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
                          setStartDate(date);
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
                          setEndDate(date);
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
                            approved: false
                          });
                        }

                        return dayEntries.map((entry, entryIndex) => {
                          const dailyTotal = dayEntries.reduce((sum, e) => sum + e.hours, 0);
                          
                          return (
                            <TableRow key={`${entry.id}-${entryIndex}`} className="hover:bg-muted/20">
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={entry.approved}
                                  onCheckedChange={(checked) => 
                                    updateEntry(entry.id, 'approved', checked)
                                  }
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
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="time"
                                  value={entry.timeOut}
                                  onChange={(e) => updateEntry(entry.id, 'timeOut', e.target.value)}
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <Select 
                                  value={entry.payCode}
                                  onValueChange={(value) => updateEntry(entry.id, 'payCode', value)}
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
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Weekly Summary by Pay Code</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(totalsByPayCode).map(([payCode, hours]) => (
                      <Card key={payCode}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{payCode}</span>
                            <span className="font-mono text-lg font-semibold">
                              {hours.toFixed(2)} hrs
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total Hours:</span>
                      <span className="text-xl font-mono font-bold">
                        {Object.values(totalsByPayCode).reduce((sum, hours) => sum + hours, 0).toFixed(2)} hrs
                      </span>
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
    </div>
  );
}