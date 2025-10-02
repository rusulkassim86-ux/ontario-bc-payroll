import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePayCycles } from '@/hooks/usePayCycles';
import { usePayrollCycleStatus, useProcessPayrollCycle } from '@/hooks/usePayrollCycleStatus';
import { Clock, PlayCircle, CheckCircle2, Lock, AlertCircle, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

const COMPANY_CODES = ['72S', '72R', 'OZC'] as const;

export default function PayrollDashboard() {
  const { profile } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<string>('72S');
  
  const { data: payCycles = [], isLoading: cyclesLoading } = usePayCycles(selectedCompany);
  const { data: cycleStatus = [], isLoading: statusLoading } = usePayrollCycleStatus(selectedCompany);
  const processPayroll = useProcessPayrollCycle();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="gap-1"><PlayCircle className="h-3 w-3" />Processing</Badge>;
      case 'processed':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" />Processed</Badge>;
      case 'posted':
        return <Badge variant="default" className="gap-1 bg-blue-600"><Lock className="h-3 w-3" />Posted to GL</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleProcessPayroll = (payCycleId: string) => {
    if (confirm('Process payroll for this cycle? This will lock all timesheets.')) {
      processPayroll.mutate({ payCycleId, companyCode: selectedCompany });
    }
  };

  // Combine pay cycles with their status
  const cyclesWithStatus = payCycles.map(cycle => {
    const status = cycleStatus.find(s => s.pay_cycle_id === cycle.id);
    return { ...cycle, status: status || null };
  });

  // Calculate summary stats
  const summary = {
    total: cyclesWithStatus.length,
    pending: cyclesWithStatus.filter(c => !c.status || c.status.status === 'pending').length,
    processing: cyclesWithStatus.filter(c => c.status?.status === 'in_progress').length,
    processed: cyclesWithStatus.filter(c => c.status?.status === 'processed').length,
    posted: cyclesWithStatus.filter(c => c.status?.status === 'posted').length,
  };

  return (
    <AppLayout>
      <PageHeader
        title="Payroll Dashboard"
        description="Unified payroll processing for 72S, 72R, and OZC"
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Cycles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary.processing}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.processed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Payroll Cycles</CardTitle>
            <CardDescription>View and process payroll by company code</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedCompany} onValueChange={setSelectedCompany}>
              <TabsList>
                {COMPANY_CODES.map(code => (
                  <TabsTrigger key={code} value={code}>
                    {code}
                  </TabsTrigger>
                ))}
              </TabsList>

              {COMPANY_CODES.map(code => (
                <TabsContent key={code} value={code} className="mt-4">
                  {cyclesLoading || statusLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : cyclesWithStatus.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No pay cycles found for {code}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Week #</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Pay Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Employees</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Gross</TableHead>
                          <TableHead>Net</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cyclesWithStatus.map((cycle) => (
                          <TableRow key={cycle.id}>
                            <TableCell className="font-medium">{cycle.week_number}</TableCell>
                            <TableCell>
                              {format(parseISO(cycle.period_start), 'MMM d')} - {format(parseISO(cycle.period_end), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>{format(parseISO(cycle.pay_date), 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              {getStatusBadge(cycle.status?.status || 'pending')}
                            </TableCell>
                            <TableCell>
                              {cycle.status ? `${cycle.status.processed_employees}/${cycle.status.total_employees}` : '-'}
                            </TableCell>
                            <TableCell>
                              {cycle.status?.total_hours ? cycle.status.total_hours.toFixed(2) : '-'}
                            </TableCell>
                            <TableCell>
                              {cycle.status?.total_gross ? `$${cycle.status.total_gross.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                            </TableCell>
                            <TableCell>
                              {cycle.status?.total_net ? `$${cycle.status.total_net.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                            </TableCell>
                            <TableCell>
                              {(!cycle.status || cycle.status.status === 'pending') && (
                                <Button
                                  size="sm"
                                  onClick={() => handleProcessPayroll(cycle.id)}
                                  disabled={processPayroll.isPending}
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  Process
                                </Button>
                              )}
                              {cycle.status?.status === 'processed' && (
                                <Badge variant="outline" className="gap-1 bg-green-50">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Complete
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}