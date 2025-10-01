import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calculator, 
  FileText, 
  DollarSign, 
  Users, 
  Play,
  CheckCircle,
  AlertTriangle,
  Building2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePayrollRuns } from "@/hooks/usePayrollRuns";
import { useEmployeesByCompanyCode } from "@/hooks/useEmployeesByCompanyCode";
import { format } from "date-fns";

export default function Payroll() {
  const [activeTab, setActiveTab] = useState("current");
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>("OZC");
  const { payrollRuns, currentRun, loading: runsLoading } = usePayrollRuns(selectedCompanyCode);
  const { employees, loading: employeesLoading } = useEmployeesByCompanyCode(selectedCompanyCode);

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; text: string }> = {
      'draft': { variant: 'secondary', text: 'Draft' },
      'in_progress': { variant: 'default', text: 'In Progress' },
      'processed': { variant: 'default', text: 'Processed' },
      'approved': { variant: 'default', text: 'Approved' },
    };
    const config = statusMap[status] || { variant: 'secondary', text: status };
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const totalGross = currentRun?.grossPay || 0;
  const totalNet = currentRun?.netPay || 0;
  const totalEmployees = employees.length;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Payroll" 
        description="Best Theratronics Inc. - Payroll by Company Code"
        action={
          <Button 
            className="bg-gradient-primary"
            disabled={totalEmployees === 0}
            onClick={() => {
              // TODO: Open payroll run drawer
              alert(`Run payroll for ${totalEmployees} ${selectedCompanyCode} employees`);
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            Run Payroll
          </Button>
        }
      />
      
      <div className="px-6 space-y-6">
        {/* Company Code Selector */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Select Company Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label htmlFor="company-code">Company Code:</Label>
              <Select value={selectedCompanyCode} onValueChange={setSelectedCompanyCode}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OZC">OZC - Kitsault (Active)</SelectItem>
                  <SelectItem value="72R">72R - Reserved</SelectItem>
                  <SelectItem value="72S">72S - Reserved</SelectItem>
                </SelectContent>
              </Select>
              {employeesLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : (
                <Badge variant="outline">
                  {totalEmployees} {totalEmployees === 1 ? 'Employee' : 'Employees'}
                </Badge>
              )}
            </div>
            {totalEmployees === 0 && selectedCompanyCode !== "OZC" && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No employees found for {selectedCompanyCode}. Upload employees to run payroll for this code.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Payroll Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {runsLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : (
            <>
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Calculator className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{currentRun ? formatCurrency(totalGross) : 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">Current Gross Pay</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-lg">
                      <DollarSign className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{currentRun ? formatCurrency(totalNet) : 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">Current Net Pay</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <Users className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalEmployees}</p>
                      <p className="text-sm text-muted-foreground">{selectedCompanyCode} Employees</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Current Payroll Status */}
        {currentRun ? (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Current Payroll Run - {selectedCompanyCode}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Run ID: {currentRun.id.substring(0, 8)}...
                  </h3>
                  <p className="text-muted-foreground">
                    {format(new Date(currentRun.created_at), 'PPP')}
                  </p>
                </div>
                {getStatusBadge(currentRun.status)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success mx-auto mb-1" />
                  <p className="text-sm font-medium">Employees</p>
                  <p className="text-xs text-muted-foreground">{currentRun.employeeCount}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success mx-auto mb-1" />
                  <p className="text-sm font-medium">Gross Pay</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(currentRun.grossPay)}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success mx-auto mb-1" />
                  <p className="text-sm font-medium">Deductions</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(currentRun.deductions)}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success mx-auto mb-1" />
                  <p className="text-sm font-medium">Net Pay</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(currentRun.netPay)}</p>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Preview Register
                </Button>
                <Button className="bg-success text-success-foreground ml-auto">
                  Continue Processing
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Current Payroll Run - {selectedCompanyCode}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calculator className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Payroll Run</h3>
                <p className="text-muted-foreground mb-4">
                  Click "Run Payroll" to start a new payroll run for {selectedCompanyCode}
                </p>
                {totalEmployees === 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Upload employees for {selectedCompanyCode} before running payroll
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payroll History Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">Current Period</TabsTrigger>
            <TabsTrigger value="history">Payroll History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Employee Breakdown - {selectedCompanyCode}</CardTitle>
              </CardHeader>
              <CardContent>
                {employeesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : employees.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee #</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Province</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.employee_number}</TableCell>
                          <TableCell>{emp.first_name} {emp.last_name}</TableCell>
                          <TableCell>{emp.province_code}</TableCell>
                          <TableCell>{emp.employee_group}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-success/10 text-success">
                              {emp.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No employees found for {selectedCompanyCode}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Payroll History - {selectedCompanyCode}</CardTitle>
              </CardHeader>
              <CardContent>
                {runsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : payrollRuns.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Run ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Employees</TableHead>
                        <TableHead className="text-right">Gross Pay</TableHead>
                        <TableHead className="text-right">Net Pay</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollRuns.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell className="font-mono text-sm">
                            {run.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            {format(new Date(run.created_at), 'PP')}
                          </TableCell>
                          <TableCell>{getStatusBadge(run.status)}</TableCell>
                          <TableCell>{run.employeeCount}</TableCell>
                          <TableCell className="text-right">{formatCurrency(run.grossPay)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(run.netPay)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Payroll History</h3>
                    <p className="text-muted-foreground">
                      Payroll runs for {selectedCompanyCode} will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
