import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { LegacyEmployee } from '@/types/employee';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';

interface TimecardsTabProps {
  employee: LegacyEmployee;
}

export function TimecardsTab({ employee }: TimecardsTabProps) {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [viewType, setViewType] = useState<'weekly' | 'biweekly'>('biweekly');

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateHours = (timeIn: string, timeOut: string) => {
    if (!timeIn || !timeOut) return 0;
    const start = new Date(`2000-01-01T${timeIn}`);
    const end = new Date(`2000-01-01T${timeOut}`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  };

  // Mock timecard data
  const mockTimecards = [
    {
      date: '2024-01-15',
      timeIn: '08:00',
      timeOut: '16:30',
      lunchStart: '12:00',
      lunchEnd: '13:00',
      payCode: 'REG',
      department: 'Administration',
      project: 'General',
      hours: 7.5,
      status: 'approved'
    },
    {
      date: '2024-01-16',
      timeIn: '08:15',
      timeOut: '17:00',
      lunchStart: '12:30',
      lunchEnd: '13:30',
      payCode: 'REG',
      department: 'Administration',
      project: 'General',
      hours: 7.75,
      status: 'approved'
    },
    {
      date: '2024-01-17',
      timeIn: '08:00',
      timeOut: '18:00',
      lunchStart: '12:00',
      lunchEnd: '13:00',
      payCode: 'REG',
      department: 'Administration',
      project: 'General',
      hours: 8.0,
      overtimeHours: 1.0,
      status: 'pending'
    },
    {
      date: '2024-01-18',
      timeIn: '09:00',
      timeOut: '17:00',
      lunchStart: '12:00',
      lunchEnd: '13:00',
      payCode: 'REG',
      department: 'Administration',
      project: 'General',
      hours: 7.0,
      status: 'approved'
    },
    {
      date: '2024-01-19',
      timeIn: '08:30',
      timeOut: '16:30',
      lunchStart: '12:15',
      lunchEnd: '13:15',
      payCode: 'REG',
      department: 'Administration',
      project: 'General',
      hours: 7.0,
      status: 'approved'
    }
  ];

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 }); // Sunday
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const totalRegularHours = mockTimecards.reduce((sum, card) => sum + card.hours, 0);
  const totalOvertimeHours = mockTimecards.reduce((sum, card) => sum + (card.overtimeHours || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Timecard Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Timecard View
            <div className="flex items-center gap-2">
              <Select value={viewType} onValueChange={(value: 'weekly' | 'biweekly') => setViewType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-48">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedWeek}
                      onSelect={(date) => date && setSelectedWeek(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Regular Hours</div>
              <div className="text-lg font-semibold text-green-600">
                {totalRegularHours.toFixed(2)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Overtime Hours</div>
              <div className="text-lg font-semibold text-orange-600">
                {totalOvertimeHours.toFixed(2)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total Hours</div>
              <div className="text-lg font-semibold text-blue-600">
                {(totalRegularHours + totalOvertimeHours).toFixed(2)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant="secondary">In Progress</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Timecard Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weekDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const timecard = mockTimecards.find(t => t.date === dayStr);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              
              return (
                <div key={dayStr} className={`grid grid-cols-1 md:grid-cols-8 gap-4 p-4 border rounded-lg ${isWeekend ? 'bg-gray-50' : ''}`}>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                    <div className="text-xs text-muted-foreground">{format(day, 'MMM dd')}</div>
                  </div>
                  
                  {timecard ? (
                    <>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Time In</div>
                        <div className="text-sm font-medium">{formatTime(timecard.timeIn)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Time Out</div>
                        <div className="text-sm font-medium">{formatTime(timecard.timeOut)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Lunch</div>
                        <div className="text-sm font-medium">
                          {formatTime(timecard.lunchStart)} - {formatTime(timecard.lunchEnd)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Pay Code</div>
                        <Badge variant="outline">{timecard.payCode}</Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Department</div>
                        <div className="text-sm">{timecard.department}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Hours</div>
                        <div className="text-sm font-medium">
                          {timecard.hours.toFixed(2)}
                          {timecard.overtimeHours && (
                            <span className="text-orange-600"> (+{timecard.overtimeHours.toFixed(2)} OT)</span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Status</div>
                        <Badge className={getStatusColor(timecard.status)}>
                          {timecard.status}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-7 text-center text-muted-foreground py-2">
                        {isWeekend ? 'Weekend' : 'No time entry'}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pay Code Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pay Code Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Pay Code</div>
                <div className="font-medium">REG - Regular Time</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Hours</div>
                <div className="font-medium">{totalRegularHours.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Rate</div>
                <div className="font-medium">
                  {employee.salary ? 
                    `$${(employee.salary).toFixed(2)}/hr` : 
                    'Salary'
                  }
                </div>
              </div>
            </div>
            
            {totalOvertimeHours > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Pay Code</div>
                  <div className="font-medium">OT - Overtime</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Hours</div>
                  <div className="font-medium">{totalOvertimeHours.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Rate</div>
                  <div className="font-medium">
                    {employee.salary ? 
                      `$${(employee.salary * (employee.ot_multiplier || 1.5)).toFixed(2)}/hr` : 
                      `${employee.ot_multiplier || 1.5}x Salary`
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Department Allocation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Department Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Department</div>
                <div className="font-medium">Administration</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Cost Center</div>
                <div className="font-medium">{(employee as any).gl_cost_center || 'ADM-001'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Hours</div>
                <div className="font-medium">{(totalRegularHours + totalOvertimeHours).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Percentage</div>
                <div className="font-medium">100%</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}