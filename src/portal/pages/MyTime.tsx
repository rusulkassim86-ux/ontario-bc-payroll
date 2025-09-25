import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Plus, Download } from 'lucide-react';

export function MyTime() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Mock timesheet data
  const timesheetEntries = [
    { date: '2024-12-02', regular: 8, overtime: 0, status: 'submitted' },
    { date: '2024-12-01', regular: 8, overtime: 2, status: 'approved' },
    { date: '2024-11-30', regular: 7.5, overtime: 0, status: 'approved' },
    { date: '2024-11-29', regular: 8, overtime: 1.5, status: 'approved' },
  ];

  const totalHours = timesheetEntries.reduce((sum, entry) => sum + entry.regular + entry.overtime, 0);
  const regularHours = timesheetEntries.reduce((sum, entry) => sum + entry.regular, 0);
  const overtimeHours = timesheetEntries.reduce((sum, entry) => sum + entry.overtime, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Time</h1>
          <p className="text-muted-foreground">
            View and manage your timesheet entries
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Time Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="portal-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours}</div>
            <p className="text-xs text-muted-foreground">This pay period</p>
          </CardContent>
        </Card>

        <Card className="portal-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regular Hours</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{regularHours}</div>
            <p className="text-xs text-muted-foreground">Standard time</p>
          </CardContent>
        </Card>

        <Card className="portal-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overtime Hours</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{overtimeHours}</div>
            <p className="text-xs text-muted-foreground">1.5x rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Timesheet Entries */}
      <Card className="portal-card">
        <CardHeader>
          <CardTitle>Recent Entries</CardTitle>
          <CardDescription>Your timesheet for the current pay period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timesheetEntries.map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium">
                    {new Date(entry.date).toLocaleDateString('en-CA', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Regular: {entry.regular}h
                    {entry.overtime > 0 && ` • OT: ${entry.overtime}h`}
                  </div>
                </div>
                <Badge variant={entry.status === 'approved' ? 'default' : 'secondary'}>
                  {entry.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}