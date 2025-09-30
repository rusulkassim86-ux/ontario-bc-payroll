import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Receipt, Download, Send, DollarSign, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useCRAIntegration } from '@/hooks/useCRAIntegration';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';

export function RemittanceReportsManager() {
  const { 
    remittancePeriods, 
    fetchRemittancePeriods, 
    calculateRemittanceTotals, 
    generatePD7AReport,
    loading 
  } = useCRAIntegration();
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showCalculateDialog, setShowCalculateDialog] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly'>('monthly');

  useEffect(() => {
    fetchRemittancePeriods(selectedYear);
  }, [selectedYear, fetchRemittancePeriods]);

  const calculateNewPeriod = async () => {
    if (!periodStart || !periodEnd) return;

    try {
      await calculateRemittanceTotals(periodStart, periodEnd, periodType);
      
      setShowCalculateDialog(false);
      setPeriodStart('');
      setPeriodEnd('');
      
      await fetchRemittancePeriods(selectedYear);
    } catch (error) {
      console.error('Failed to calculate period:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-blue-100 text-blue-800';
      case 'calculated': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="w-4 h-4" />;
      case 'calculated': return <AlertCircle className="w-4 h-4" />;
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'submitted': return <Send className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const totalRemittancesDue = remittancePeriods
    .filter(p => ['calculated', 'draft'].includes(p.status))
    .reduce((sum, p) => sum + p.total_remittance, 0);

  const overduePeriods = remittancePeriods.filter(p => 
    new Date(p.due_date) < new Date() && !['paid', 'submitted'].includes(p.status)
  );

  const nextDueDate = remittancePeriods
    .filter(p => !['paid', 'submitted'].includes(p.status) && new Date(p.due_date) >= new Date())
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]?.due_date;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Due</p>
                <p className="text-2xl font-bold">${totalRemittancesDue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Periods</p>
                <p className="text-2xl font-bold text-red-600">{overduePeriods.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Next Due</p>
                <p className="text-sm font-semibold">
                  {nextDueDate ? format(new Date(nextDueDate), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Periods</p>
                <p className="text-2xl font-bold">{remittancePeriods.length}</p>
              </div>
              <Receipt className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Source Deduction Remittances
          </CardTitle>
          <CardDescription>
            Manage CPP, EI, and income tax remittances for {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="year">Tax Year:</Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={showCalculateDialog} onOpenChange={setShowCalculateDialog}>
              <DialogTrigger asChild>
                <Button>Calculate New Period</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Calculate Remittance Period</DialogTitle>
                  <DialogDescription>
                    Calculate source deductions for a specific period
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Period Type</Label>
                    <Select value={periodType} onValueChange={(value) => setPeriodType(value as 'monthly' | 'quarterly')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Period Start</Label>
                      <Input
                        type="date"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Period End</Label>
                      <Input
                        type="date"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={calculateNewPeriod}
                    disabled={!periodStart || !periodEnd || loading}
                    className="w-full"
                  >
                    {loading ? 'Calculating...' : 'Calculate Period'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Remittance Periods Table */}
      <Card>
        <CardHeader>
          <CardTitle>Remittance Periods ({selectedYear})</CardTitle>
          <CardDescription>
            {remittancePeriods.length} periods for the selected year
          </CardDescription>
        </CardHeader>
        <CardContent>
          {remittancePeriods.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Income Tax</TableHead>
                  <TableHead>CPP</TableHead>
                  <TableHead>EI</TableHead>
                  <TableHead>Total Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remittancePeriods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {format(new Date(period.period_start), 'MMM dd')} - {format(new Date(period.period_end), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {period.period_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className={`text-sm ${new Date(period.due_date) < new Date() && period.status !== 'filed' ? 'text-red-600 font-semibold' : ''}`}>
                        {format(new Date(period.due_date), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>${period.total_income_tax.toFixed(2)}</TableCell>
                    <TableCell>
                      ${(period.total_cpp_employee + period.total_cpp_employer).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ${(period.total_ei_employee + period.total_ei_employer).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${period.total_remittance.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(period.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(period.status)}
                          {period.status}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {['draft', 'calculated'].includes(period.status) && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => generatePD7AReport(period.id)}
                              disabled={loading}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          </>
                        )}
                        {period.pd7a_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={period.pd7a_url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4" />
                            </a>
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
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No remittance periods calculated for {selectedYear}</p>
              <p className="text-sm">Click "Calculate New Period" to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}