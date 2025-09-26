import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Calendar,
  Download,
  FileText,
  AlertCircle,
  Plus,
  Eye,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useCRAReports } from '@/hooks/useCRAReports';
import { format, parseISO } from 'date-fns';

export function CRARemittanceReports() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [reportType, setReportType] = useState<'monthly' | 'quarterly'>('monthly');
  
  const { 
    useRemittanceReports, 
    generateRemittanceReport, 
    exportReport 
  } = useCRAReports();
  
  const { data: reports, isLoading } = useRemittanceReports(selectedYear);

  const handleGenerateReport = async () => {
    if (!periodStart || !periodEnd) {
      return;
    }

    // Mock company ID - in real app, get from auth context
    const companyId = 'mock-company-id';
    
    generateRemittanceReport.mutate({
      companyId,
      periodStart,
      periodEnd,
      reportType,
    });
  };

  const handleExportReport = async (report: any, exportFormat: 'pdf' | 'excel' | 'csv') => {
    const filename = `CRA_Remittance_${format(parseISO(report.report_period_start), 'yyyy-MM')}_to_${format(parseISO(report.report_period_end), 'yyyy-MM')}.${exportFormat}`;
    await exportReport(exportFormat, report, filename);
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date();
    
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className={isOverdue ? 'border-red-500 text-red-700' : ''}>
          <Clock className="w-3 h-3 mr-1" />
          Draft {isOverdue && '(Overdue)'}
        </Badge>;
      case 'finalized':
        return <Badge variant="secondary">
          <CheckCircle className="w-3 h-3 mr-1" />
          Finalized
        </Badge>;
      case 'submitted':
        return <Badge variant="default">
          <CheckCircle className="w-3 h-3 mr-1" />
          Submitted
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">CRA Remittance Reports</h2>
          <p className="text-muted-foreground">
            Generate and manage monthly/quarterly CRA remittance reports
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Generate New Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Generate New Remittance Report
          </CardTitle>
          <CardDescription>
            Create a new CRA remittance report for a specific period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="period-start">Period Start</Label>
              <Input
                id="period-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="period-end">Period End</Label>
              <Input
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={(value: 'monthly' | 'quarterly') => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            onClick={handleGenerateReport}
            disabled={!periodStart || !periodEnd || generateRemittanceReport.isPending}
            className="w-full"
          >
            {generateRemittanceReport.isPending ? 'Generating...' : 'Generate Report'}
          </Button>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Remittance Reports ({selectedYear})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading reports...</div>
          ) : reports && reports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Total Due</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      {format(parseISO(report.report_period_start), 'MMM dd')} - {format(parseISO(report.report_period_end), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="capitalize">{report.report_type}</TableCell>
                    <TableCell className="font-medium">
                      ${report.total_remittance_due.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(report.due_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(report.status, report.due_date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleExportReport(report, 'pdf')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No remittance reports found for {selectedYear}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {reports && reports.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Remitted ({selectedYear})</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${reports
                  .filter(r => r.status === 'submitted')
                  .reduce((sum, r) => sum + r.total_remittance_due, 0)
                  .toLocaleString('en-CA', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                From {reports.filter(r => r.status === 'submitted').length} submitted reports
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Remittances</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ${reports
                  .filter(r => r.status !== 'submitted')
                  .reduce((sum, r) => sum + r.total_remittance_due, 0)
                  .toLocaleString('en-CA', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                From {reports.filter(r => r.status !== 'submitted').length} pending reports
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Due Date</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {(() => {
                const nextDue = reports
                  .filter(r => r.status !== 'submitted' && new Date(r.due_date) >= new Date())
                  .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
                
                return nextDue ? (
                  <>
                    <div className="text-2xl font-bold">
                      {format(parseISO(nextDue.due_date), 'MMM dd')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ${nextDue.total_remittance_due.toLocaleString('en-CA', { minimumFractionDigits: 2 })} due
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-green-600">-</div>
                    <p className="text-xs text-muted-foreground">No pending remittances</p>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}