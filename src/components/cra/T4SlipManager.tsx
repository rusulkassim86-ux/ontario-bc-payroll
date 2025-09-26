import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText,
  Download,
  Eye,
  Users,
  CheckCircle,
  AlertTriangle,
  Edit,
  Send,
  Plus
} from 'lucide-react';
import { useCRAReports, T4Slip } from '@/hooks/useCRAReports';
import { format } from 'date-fns';

export function T4SlipManager() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSlip, setSelectedSlip] = useState<T4Slip | null>(null);
  
  const { 
    useT4Slips, 
    generateT4Slips, 
    updateSlipStatus,
    exportReport 
  } = useCRAReports();
  
  const { data: t4Slips, isLoading } = useT4Slips(selectedYear);

  const handleGenerateT4Slips = async () => {
    // Mock company ID - in real app, get from auth context
    const companyId = 'mock-company-id';
    
    generateT4Slips.mutate({
      companyId,
      taxYear: selectedYear,
    });
  };

  const handleUpdateStatus = async (slipId: string, status: string) => {
    updateSlipStatus.mutate({
      slipId,
      status,
      slipType: 't4',
    });
  };

  const handleExportSlip = async (slip: T4Slip, format: 'pdf' | 'xml') => {
    const filename = `T4_${slip.employee?.employee_number}_${slip.tax_year}.${format}`;
    await exportReport(format, slip, filename);
  };

  const handleBulkExport = async (format: 'pdf' | 'xml') => {
    if (!t4Slips) return;
    
    const filename = `T4_Slips_${selectedYear}_Bulk.${format}`;
    await exportReport(format, t4Slips, filename);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'finalized':
        return <Badge variant="secondary">Finalized</Badge>;
      case 'issued':
        return <Badge variant="default">Issued</Badge>;
      case 'amended':
        return <Badge variant="destructive">Amended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const validationIssues = t4Slips ? t4Slips.filter(slip => {
    // Check for common validation issues
    const totalEarnings = slip.box_14_employment_income;
    const cppContributions = slip.box_16_cpp_contributions;
    const eiPremiums = slip.box_18_ei_premiums;
    
    // Mock validation - in real app, use actual CRA limits
    const cppMax = 3754.45; // 2024 CPP max
    const eiMax = 1049.12;  // 2024 EI max
    
    return cppContributions > cppMax || eiPremiums > eiMax || totalEarnings <= 0;
  }) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">T4 Slip Management</h2>
          <p className="text-muted-foreground">
            Generate and manage T4 slips for employees
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

      {/* Validation Alerts */}
      {validationIssues.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{validationIssues.length} T4 slip(s) have validation issues:</strong>
            <ul className="mt-2 list-disc list-inside">
              {validationIssues.map((slip) => (
                <li key={slip.id}>
                  {slip.employee?.first_name} {slip.employee?.last_name} - 
                  Check CPP/EI contribution limits and earnings amounts
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={handleGenerateT4Slips} disabled={generateT4Slips.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            {generateT4Slips.isPending ? 'Generating...' : `Generate T4s for ${selectedYear}`}
          </Button>
          
          {t4Slips && t4Slips.length > 0 && (
            <>
              <Button variant="outline" onClick={() => handleBulkExport('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                Export All (PDF)
              </Button>
              <Button variant="outline" onClick={() => handleBulkExport('xml')}>
                <Download className="h-4 w-4 mr-2" />
                Export XML
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {t4Slips && t4Slips.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total T4 Slips</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{t4Slips.length}</div>
              <p className="text-xs text-muted-foreground">
                For tax year {selectedYear}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Issued</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {t4Slips.filter(s => s.status === 'issued').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Available to employees
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {t4Slips.filter(s => s.status === 'draft' || s.status === 'finalized').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Not yet issued
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${t4Slips.reduce((sum, s) => sum + s.box_14_employment_income, 0).toLocaleString('en-CA')}
              </div>
              <p className="text-xs text-muted-foreground">
                Total employment income
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* T4 Slips Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            T4 Slips ({selectedYear})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading T4 slips...</div>
          ) : t4Slips && t4Slips.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee #</TableHead>
                  <TableHead>Employment Income</TableHead>
                  <TableHead>CPP Contributions</TableHead>
                  <TableHead>EI Premiums</TableHead>
                  <TableHead>Income Tax</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {t4Slips.map((slip) => (
                  <TableRow key={slip.id}>
                    <TableCell className="font-medium">
                      {slip.employee?.first_name} {slip.employee?.last_name}
                    </TableCell>
                    <TableCell>{slip.employee?.employee_number}</TableCell>
                    <TableCell>
                      ${slip.box_14_employment_income.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      ${slip.box_16_cpp_contributions.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      ${slip.box_18_ei_premiums.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      ${slip.box_22_income_tax_deducted.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(slip.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedSlip(slip)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                T4 Slip - {slip.employee?.first_name} {slip.employee?.last_name}
                              </DialogTitle>
                              <DialogDescription>
                                Tax year {slip.tax_year}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedSlip && <T4SlipPreview slip={selectedSlip} />}
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleExportSlip(slip, 'pdf')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        
                        {slip.status === 'finalized' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleUpdateStatus(slip.id, 'issued')}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No T4 slips found for {selectedYear}. Click "Generate T4s" to create them.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function T4SlipPreview({ slip }: { slip: T4Slip }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h4 className="font-semibold">Employee Information</h4>
          <div className="text-sm space-y-1">
            <div>Name: {slip.employee?.first_name} {slip.employee?.last_name}</div>
            <div>Employee #: {slip.employee?.employee_number}</div>
            <div>SIN: {slip.employee?.sin_encrypted ? '***-***-***' : 'Not provided'}</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold">Tax Information</h4>
          <div className="text-sm space-y-1">
            <div>Tax Year: {slip.tax_year}</div>
            <div>Status: {getStatusBadge(slip.status)}</div>
            <div>Generated: {format(new Date(slip.generated_at), 'MMM dd, yyyy')}</div>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <h4 className="font-semibold">T4 Slip Details</h4>
        <div className="grid gap-2 md:grid-cols-2 text-sm">
          <div>Box 14 - Employment Income: ${slip.box_14_employment_income.toFixed(2)}</div>
          <div>Box 16 - CPP Contributions: ${slip.box_16_cpp_contributions.toFixed(2)}</div>
          <div>Box 17 - CPP Pensionable Earnings: ${slip.box_17_cpp_pensionable_earnings.toFixed(2)}</div>
          <div>Box 18 - EI Premiums: ${slip.box_18_ei_premiums.toFixed(2)}</div>
          <div>Box 19 - EI Insurable Earnings: ${slip.box_19_ei_insurable_earnings.toFixed(2)}</div>
          <div>Box 22 - Income Tax Deducted: ${slip.box_22_income_tax_deducted.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'draft':
      return <Badge variant="outline">Draft</Badge>;
    case 'finalized':
      return <Badge variant="secondary">Finalized</Badge>;
    case 'issued':
      return <Badge variant="default">Issued</Badge>;
    case 'amended':
      return <Badge variant="destructive">Amended</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}