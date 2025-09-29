import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search, Save, Eye, EyeOff } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { LegacyEmployee } from '@/types/employee';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';

interface ADPTimecardModuleProps {
  employeeId: string;
}

interface TimecardEntry {
  id: string;
  date: string;
  timeIn: string;
  timeOut: string;
  lunchStart?: string;
  lunchEnd?: string;
  payCode: string;
  hours: number;
  department: string;
  approved: boolean;
  isEditing?: boolean;
}

export function ADPTimecardModule({ employeeId }: ADPTimecardModuleProps) {
  const { employee, isLoading } = useEmployeeProfile(employeeId);
  const [selectedPeriod, setSelectedPeriod] = useState(new Date());
  const [showFullSIN, setShowFullSIN] = useState(false);
  const [activeTab, setActiveTab] = useState('timecard');
  const [timecardEntries, setTimecardEntries] = useState<TimecardEntry[]>([]);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  // Calculate bi-weekly pay period
  const payPeriodStart = startOfWeek(selectedPeriod, { weekStartsOn: 1 }); // Monday
  const payPeriodEnd = addDays(payPeriodStart, 13); // 14 days total
  const week1Start = payPeriodStart;
  const week1End = addDays(payPeriodStart, 6);
  const week2Start = addDays(payPeriodStart, 7);
  const week2End = payPeriodEnd;

  const week1Days = eachDayOfInterval({ start: week1Start, end: week1End });
  const week2Days = eachDayOfInterval({ start: week2Start, end: week2End });

  useEffect(() => {
    // Initialize mock timecard data
    const mockEntries: TimecardEntry[] = [];
    const allDays = [...week1Days, ...week2Days];
    
    allDays.forEach((day, index) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      
      if (!isWeekend) {
        mockEntries.push({
          id: `entry-${index}`,
          date: dayStr,
          timeIn: '08:00',
          timeOut: '16:30',
          lunchStart: '12:00',
          lunchEnd: '13:00',
          payCode: 'REG',
          hours: 7.5,
          department: 'Administration',
          approved: false
        });
      }
    });
    
    setTimecardEntries(mockEntries);
  }, [selectedPeriod]);

  const maskSIN = (sin: string) => {
    if (!sin || sin.length < 9) return 'XXX XXX XXX';
    return `XXX XX${sin.slice(-4)}`;
  };

  const calculateWeekTotals = (entries: TimecardEntry[], weekDays: Date[]) => {
    const weekEntries = entries.filter(entry => 
      weekDays.some(day => format(day, 'yyyy-MM-dd') === entry.date)
    );
    
    return {
      regularHours: weekEntries.reduce((sum, entry) => entry.payCode === 'REG' ? sum + entry.hours : sum, 0),
      overtimeHours: weekEntries.reduce((sum, entry) => entry.payCode === 'OT' ? sum + entry.hours : sum, 0),
      totalHours: weekEntries.reduce((sum, entry) => sum + entry.hours, 0)
    };
  };

  const week1Totals = calculateWeekTotals(timecardEntries, week1Days);
  const week2Totals = calculateWeekTotals(timecardEntries, week2Days);

  const handleCellEdit = (id: string, field: string, value: string) => {
    setTimecardEntries(prev => prev.map(entry => 
      entry.id === id ? { 
        ...entry, 
        [field]: field === 'hours' ? parseFloat(value) || 0 : value 
      } : entry
    ));
    setEditingCell(null);
  };

  const handleApproveAll = () => {
    setTimecardEntries(prev => prev.map(entry => ({ ...entry, approved: true })));
  };

  const renderTimecardGrid = (weekDays: Date[], weekLabel: string) => {
    const weekEntries = timecardEntries.filter(entry => 
      weekDays.some(day => format(day, 'yyyy-MM-dd') === entry.date)
    );

    return (
      <div className="mb-6">
        <h3 className="font-semibold mb-3 text-lg">{weekLabel}</h3>
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-8 bg-muted font-semibold text-sm p-2 border-b">
            <div className="text-center">Approve</div>
            <div>Day/Date</div>
            <div>In - Out</div>
            <div>Pay Code</div>
            <div className="text-center">Hours</div>
            <div>Department</div>
            <div className="text-center">Daily Total</div>
            <div>Actions</div>
          </div>

          {/* Days */}
          {weekDays.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const entry = weekEntries.find(e => e.date === dayStr);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div key={dayStr} className={`grid grid-cols-8 p-2 border-b ${isWeekend ? 'bg-gray-50' : ''}`}>
                <div className="flex justify-center items-center">
                  {entry && (
                    <Checkbox
                      checked={entry.approved}
                      onCheckedChange={(checked) => 
                        setTimecardEntries(prev => prev.map(e => 
                          e.id === entry.id ? { ...e, approved: !!checked } : e
                        ))
                      }
                    />
                  )}
                </div>
                
                <div className="flex flex-col">
                  <span className="font-medium">{format(day, 'EEE')}</span>
                  <span className="text-xs text-muted-foreground">{format(day, 'MM/dd')}</span>
                </div>

                {entry ? (
                  <>
                    <div className="flex items-center space-x-1">
                      {editingCell?.id === entry.id && editingCell?.field === 'timeIn' ? (
                        <Input
                          type="time"
                          value={entry.timeIn}
                          onChange={(e) => handleCellEdit(entry.id, 'timeIn', e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          className="h-8 text-xs"
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                          onClick={() => setEditingCell({ id: entry.id, field: 'timeIn' })}
                        >
                          {entry.timeIn}
                        </span>
                      )}
                      <span>-</span>
                      {editingCell?.id === entry.id && editingCell?.field === 'timeOut' ? (
                        <Input
                          type="time"
                          value={entry.timeOut}
                          onChange={(e) => handleCellEdit(entry.id, 'timeOut', e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          className="h-8 text-xs"
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                          onClick={() => setEditingCell({ id: entry.id, field: 'timeOut' })}
                        >
                          {entry.timeOut}
                        </span>
                      )}
                    </div>

                    <div>
                      {editingCell?.id === entry.id && editingCell?.field === 'payCode' ? (
                        <Select 
                          value={entry.payCode} 
                          onValueChange={(value) => handleCellEdit(entry.id, 'payCode', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="REG">REG - Regular</SelectItem>
                            <SelectItem value="OT">OT - Overtime</SelectItem>
                            <SelectItem value="VAC">VAC - Vacation</SelectItem>
                            <SelectItem value="SICK">SICK - Sick Leave</SelectItem>
                            <SelectItem value="HOL">HOL - Holiday</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer"
                          onClick={() => setEditingCell({ id: entry.id, field: 'payCode' })}
                        >
                          {entry.payCode}
                        </Badge>
                      )}
                    </div>

                    <div className="text-center">
                      {editingCell?.id === entry.id && editingCell?.field === 'hours' ? (
                        <Input
                          type="number"
                          step="0.25"
                          value={entry.hours}
                          onChange={(e) => handleCellEdit(entry.id, 'hours', e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          className="h-8 text-xs w-16"
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                          onClick={() => setEditingCell({ id: entry.id, field: 'hours' })}
                        >
                          {entry.hours.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div>
                      {editingCell?.id === entry.id && editingCell?.field === 'department' ? (
                        <Input
                          value={entry.department}
                          onChange={(e) => handleCellEdit(entry.id, 'department', e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          className="h-8 text-xs"
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                          onClick={() => setEditingCell({ id: entry.id, field: 'department' })}
                        >
                          {entry.department}
                        </span>
                      )}
                    </div>

                    <div className="text-center font-semibold">
                      {entry.hours.toFixed(2)}
                    </div>

                    <div className="flex justify-center">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <Save className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center text-muted-foreground text-sm">
                      {isWeekend ? 'Weekend' : 'No entry'}
                    </div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                  </>
                )}
              </div>
            );
          })}

          {/* Week Totals */}
          <div className="grid grid-cols-8 p-2 bg-blue-50 font-semibold">
            <div></div>
            <div className="font-bold">{weekLabel} Totals:</div>
            <div></div>
            <div>REG: {calculateWeekTotals(timecardEntries, weekDays).regularHours.toFixed(2)}</div>
            <div className="text-center">{calculateWeekTotals(timecardEntries, weekDays).totalHours.toFixed(2)}</div>
            <div></div>
            <div className="text-center font-bold">{calculateWeekTotals(timecardEntries, weekDays).totalHours.toFixed(2)}</div>
            <div></div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading || !employee) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Employee Header Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="text-lg">
                  {employee.first_name[0]}{employee.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{employee.first_name} {employee.last_name}</h2>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-muted-foreground">
                  <div>Employee ID: <span className="font-mono">{employee.employee_number}</span></div>
                  <div>
                    Tax ID: 
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFullSIN(!showFullSIN)}
                      className="h-6 w-6 p-0 ml-1"
                    >
                      {showFullSIN ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                    <span className="font-mono ml-1">
                      {showFullSIN ? employee.sin_encrypted : maskSIN(employee.sin_encrypted || '')}
                    </span>
                  </div>
                  <div>Hire Date: {employee.hire_date ? format(new Date(employee.hire_date), 'MMM dd, yyyy') : 'Not set'}</div>
                  <div>Status: <Badge variant="default">{employee.status}</Badge></div>
                </div>
              </div>
            </div>
            
            <Button onClick={handleApproveAll} className="bg-green-600 hover:bg-green-700">
              Approve Timecard
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Pay Period Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm font-medium">Pay Period:</label>
                <div className="text-lg font-semibold">
                  {format(payPeriodStart, 'MMM dd')} - {format(payPeriodEnd, 'MMM dd, yyyy')}
                </div>
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Select Period
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedPeriod}
                    onSelect={(date) => date && setSelectedPeriod(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              
              <Button>
                <Search className="w-4 h-4 mr-2" />
                Find
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Pay Frequency: {employee.pay_frequency || 'Bi-weekly'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timecard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="timecard">Timecard</TabsTrigger>
          <TabsTrigger value="totals">Totals</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="supplemental">Supplemental Pay</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off Balances</TabsTrigger>
        </TabsList>

        <TabsContent value="timecard" className="space-y-6 mt-6">
          {renderTimecardGrid(week1Days, 'Week 1')}
          {renderTimecardGrid(week2Days, 'Week 2')}
          
          {/* Pay Period Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Pay Period Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(week1Totals.regularHours + week2Totals.regularHours).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Regular Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {(week1Totals.overtimeHours + week2Totals.overtimeHours).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Overtime Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {(week1Totals.totalHours + week2Totals.totalHours).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {timecardEntries.filter(e => e.approved).length}/{timecardEntries.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Approved Days</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="totals" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Hours Summary by Pay Code</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="font-semibold">Regular Time (REG)</div>
                    <div className="text-2xl font-bold text-green-600">
                      {(week1Totals.regularHours + week2Totals.regularHours).toFixed(2)} hrs
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="font-semibold">Overtime (OT)</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {(week1Totals.overtimeHours + week2Totals.overtimeHours).toFixed(2)} hrs
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="font-semibold">Total Hours</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {(week1Totals.totalHours + week2Totals.totalHours).toFixed(2)} hrs
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Work Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Assigned Shift</label>
                    <div className="text-lg">{employee.assigned_shift || 'Day Shift'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Standard Hours</label>
                    <div className="text-lg">{employee.standard_hours || 40} hours/week</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Default Start Time</label>
                    <div className="text-lg">{employee.default_start_time || '09:00'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">FTE</label>
                    <div className="text-lg">{employee.fte || 1.0}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supplemental" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Supplemental Pay Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                No supplemental pay codes configured for this pay period
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeoff" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Time Off Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="font-semibold">Vacation</div>
                  <div className="text-2xl font-bold text-green-600">15.5 days</div>
                  <div className="text-sm text-muted-foreground">Available</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="font-semibold">Sick Leave</div>
                  <div className="text-2xl font-bold text-blue-600">6.5 days</div>
                  <div className="text-sm text-muted-foreground">Available</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="font-semibold">Personal</div>
                  <div className="text-2xl font-bold text-purple-600">3.0 days</div>
                  <div className="text-sm text-muted-foreground">Available</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}