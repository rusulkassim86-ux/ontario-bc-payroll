import { useState } from 'react';
import { usePortalAuth } from '../auth/PortalAuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText,
  Download,
  Eye,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

export function MyT4() {
  const { profile } = usePortalAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Mock T4 data - in real app, fetch from API
  const t4Slips = [
    {
      id: '1',
      tax_year: 2024,
      box_14_employment_income: 75000.00,
      box_16_cpp_contributions: 3754.45,
      box_18_ei_premiums: 1049.12,
      box_22_income_tax_deducted: 18500.00,
      status: 'issued',
      issued_at: '2024-02-15T00:00:00Z'
    },
    {
      id: '2',
      tax_year: 2023,
      box_14_employment_income: 72000.00,
      box_16_cpp_contributions: 3599.00,
      box_18_ei_premiums: 1002.45,
      box_22_income_tax_deducted: 17200.00,
      status: 'issued',
      issued_at: '2023-02-28T00:00:00Z'
    }
  ];

  const currentT4 = t4Slips.find(slip => slip.tax_year === selectedYear);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'issued':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Available
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDownloadT4 = (t4Id: string, format: 'pdf' = 'pdf') => {
    // In real app, call API to download T4
    console.log(`Downloading T4 ${t4Id} as ${format}`);
    
    // Create mock download
    const link = document.createElement('a');
    link.href = '#';
    link.download = `T4_${selectedYear}_${profile?.first_name}_${profile?.last_name}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My T4 Slips</h1>
          <p className="text-muted-foreground">
            View and download your T4 tax slips
          </p>
        </div>
        
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

      {/* T4 Status Alert */}
      {selectedYear === new Date().getFullYear() && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            <strong>T4 Release:</strong> Your {selectedYear} T4 slip will be available by February 28, {selectedYear + 1}.
            Check back after payroll processing is complete.
          </AlertDescription>
        </Alert>
      )}

      {currentT4 ? (
        <div className="space-y-6">
          {/* T4 Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    T4 Slip - {selectedYear}
                  </CardTitle>
                  <CardDescription>
                    Statement of Remuneration Paid
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(currentT4.status)}
                  {currentT4.status === 'issued' && (
                    <Button onClick={() => handleDownloadT4(currentT4.id)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Employee Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Employee Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Name:</span>
                      <span className="font-medium">{profile?.first_name} {profile?.last_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Employee #:</span>
                      <span className="font-medium">{profile?.employee?.employee_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">SIN:</span>
                      <span className="font-medium">***-***-***</span>
                    </div>
                  </div>
                </div>

                {/* Employer Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Employer Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Company:</span>
                      <span className="font-medium">Best Theratronics Inc.</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Payroll Account:</span>
                      <span className="font-medium">123456789RP0001</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Business Number:</span>
                      <span className="font-medium">123456789</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* T4 Details */}
          <Card>
            <CardHeader>
              <CardTitle>T4 Details</CardTitle>
              <CardDescription>
                Breakdown of your {selectedYear} employment income and deductions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Income */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Income
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-sm">Box 14 - Employment Income:</span>
                      <span className="font-medium">
                        ${currentT4.box_14_employment_income.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Deductions
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1">
                      <span className="text-sm">Box 16 - CPP Contributions:</span>
                      <span className="font-medium">
                        ${currentT4.box_16_cpp_contributions.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-sm">Box 18 - EI Premiums:</span>
                      <span className="font-medium">
                        ${currentT4.box_18_ei_premiums.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-t">
                      <span className="text-sm">Box 22 - Income Tax Deducted:</span>
                      <span className="font-medium">
                        ${currentT4.box_22_income_tax_deducted.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Income Summary */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Net Income (Estimated):</span>
                  <span className="text-xl font-bold">
                    ${(currentT4.box_14_employment_income - currentT4.box_16_cpp_contributions - currentT4.box_18_ei_premiums - currentT4.box_22_income_tax_deducted).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This is your employment income minus statutory deductions
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No T4 Available</h3>
            <p className="text-muted-foreground mb-4">
              Your T4 slip for {selectedYear} is not yet available.
            </p>
            {selectedYear === new Date().getFullYear() && (
              <p className="text-sm text-muted-foreground">
                T4 slips are typically available by February 28th following the tax year.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* T4 History */}
      <Card>
        <CardHeader>
          <CardTitle>T4 History</CardTitle>
          <CardDescription>
            View all your available T4 slips
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tax Year</TableHead>
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
                  <TableCell className="font-medium">{slip.tax_year}</TableCell>
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
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedYear(slip.tax_year)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {slip.status === 'issued' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownloadT4(slip.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}