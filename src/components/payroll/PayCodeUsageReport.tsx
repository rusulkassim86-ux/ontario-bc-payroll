import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  BarChart3, 
  CalendarIcon, 
  Download, 
  Users, 
  DollarSign,
  FileSpreadsheet,
  Filter
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { usePayCodeUsage } from '@/hooks/usePayCodeUsage';
import { usePayrollData } from '@/hooks/usePayrollData';
import * as XLSX from 'xlsx';

export function PayCodeUsageReport() {
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: startOfMonth(subMonths(new Date(), 1)),
    to: endOfMonth(subMonths(new Date(), 1))
  });
  
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'paycode' | 'employee' | 'department'>('paycode');
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  const { employees } = usePayrollData();
  const { usageData, summaryStats, loading, error, refreshData } = usePayCodeUsage({
    startDate: format(dateRange.from, 'yyyy-MM-dd'),
    endDate: format(dateRange.to, 'yyyy-MM-dd'),
    employeeId: selectedEmployee === 'all' ? undefined : selectedEmployee,
    department: selectedDepartment === 'all' ? undefined : selectedDepartment,
    groupBy
  });

  const departments = useMemo(() => {
    // For now, return static departments until we have department field in employees
    return ['Engineering', 'Sales', 'Marketing', 'HR', 'Operations'];
  }, [employees]);

  const exportToExcel = () => {
    if (!usageData.length) return;

    // Main usage data
    const worksheetData = usageData.map(item => ({
      'Pay Code': item.pay_code,
      'Pay Code Name': item.pay_code_name || '',
      'Category': item.category || '',
      'GL Code': item.gl_earnings_code || '',
      'Employee': groupBy === 'employee' ? item.employee_name : '',
      'Department': groupBy === 'department' ? item.department : '',
      'Total Hours': item.total_hours,
      'Total Earnings': item.total_earnings,
      'Usage Count': item.usage_count,
      'Avg Hours per Use': item.avg_hours_per_use
    }));

    // Summary data
    const summaryData = [
      { 'Metric': 'Total Pay Codes Used', 'Value': summaryStats.totalPayCodes },
      { 'Metric': 'Total Hours', 'Value': summaryStats.totalHours },
      { 'Metric': 'Total Earnings', 'Value': summaryStats.totalEarnings },
      { 'Metric': 'Employees Affected', 'Value': summaryStats.employeesAffected },
      { 'Metric': 'Period', 'Value': `${format(dateRange.from, 'yyyy-MM-dd')} to ${format(dateRange.to, 'yyyy-MM-dd')}` }
    ];

    const workbook = XLSX.utils.book_new();
    
    // Add usage data sheet
    const usageWorksheet = XLSX.utils.json_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, usageWorksheet, 'Pay Code Usage');
    
    // Add summary sheet
    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

    // Generate filename
    const fileName = `paycode_usage_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
  };

  const exportGLCodes = () => {
    if (!usageData.length) return;

    // Group by GL code for accounting
    const glData = usageData.reduce((acc, item) => {
      const glCode = item.gl_earnings_code || 'NO_GL_CODE';
      if (!acc[glCode]) {
        acc[glCode] = {
          gl_code: glCode,
          description: `Pay codes with GL ${glCode}`,
          total_earnings: 0,
          total_hours: 0,
          pay_codes: []
        };
      }
      acc[glCode].total_earnings += item.total_earnings;
      acc[glCode].total_hours += item.total_hours;
      acc[glCode].pay_codes.push(item.pay_code);
      return acc;
    }, {} as Record<string, any>);

    const glExportData = Object.values(glData).map(item => ({
      'GL Account': item.gl_code,
      'Description': item.description,
      'Total Earnings': item.total_earnings,
      'Total Hours': item.total_hours,
      'Pay Codes': item.pay_codes.join(', ')
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(glExportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'GL Summary');

    const fileName = `gl_export_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading usage data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-destructive">Error loading data: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pay Code Usage Report</h2>
          <p className="text-muted-foreground">
            Analyze pay code usage patterns and generate GL exports
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel} disabled={!usageData.length}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
          <Button variant="outline" onClick={exportGLCodes} disabled={!usageData.length}>
            <Download className="h-4 w-4 mr-2" />
            Export GL Summary
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "MM/dd/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => {
                      if (date) {
                        setDateRange(prev => ({ ...prev, from: date }));
                        setShowStartCalendar(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.to, "MM/dd/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => {
                      if (date) {
                        setDateRange(prev => ({ ...prev, to: date }));
                        setShowEndCalendar(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Employee Filter */}
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {`${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Group By */}
            <div className="space-y-2">
              <Label>Group By</Label>
              <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paycode">Pay Code</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summaryStats.totalPayCodes}</div>
                <div className="text-sm text-muted-foreground">Pay Codes Used</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">${summaryStats.totalEarnings.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total Earnings</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <BarChart3 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summaryStats.totalHours.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">Total Hours</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summaryStats.employeesAffected}</div>
                <div className="text-sm text-muted-foreground">Employees</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Details</CardTitle>
          <CardDescription>
            Detailed breakdown of pay code usage for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usageData.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pay Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>GL Code</TableHead>
                    {groupBy === 'employee' && <TableHead>Employee</TableHead>}
                    {groupBy === 'department' && <TableHead>Department</TableHead>}
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                    <TableHead className="text-right">Uses</TableHead>
                    <TableHead className="text-right">Avg Hours/Use</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono font-medium">
                        {item.pay_code}
                      </TableCell>
                      <TableCell>{item.pay_code_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.category || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.gl_earnings_code || '-'}
                      </TableCell>
                      {groupBy === 'employee' && (
                        <TableCell>{item.employee_name || '-'}</TableCell>
                      )}
                      {groupBy === 'department' && (
                        <TableCell>{item.department || '-'}</TableCell>
                      )}
                      <TableCell className="text-right font-mono">
                        {item.total_hours.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${item.total_earnings.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.usage_count}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.avg_hours_per_use.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No usage data found for the selected period and filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}