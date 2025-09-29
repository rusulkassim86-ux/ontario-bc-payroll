import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Plus, Download, Eye } from 'lucide-react';
import { useCRACompliance } from '@/hooks/useCRACompliance';
import { useEmployees } from '@/hooks/useEmployees';
import { format } from 'date-fns';

const ROE_REASONS = {
  'A': 'Shortage of work',
  'B': 'Strike or lockout',
  'C': 'Return to school',
  'D': 'Work-sharing',
  'E': 'Quit',
  'F': 'Maternity',
  'G': 'Illness or injury',
  'H': 'Compassionate care',
  'I': 'Other',
  'J': 'Unknown',
  'K': 'Leave of absence',
  'M': 'Dismissed',
  'N': 'End of contract/term',
  'P': 'Parental',
  'Q': 'Early retirement incentive',
  'R': 'Early retirement',
  'S': 'Reached normal retirement age',
  'T': 'Death',
  'U': 'Lay-off'
};

export function ROEManager() {
  const { roeSlips, generateROESlip, loading } = useCRACompliance();
  const { useEmployeesList } = useEmployees();
  const { data: employees = [] } = useEmployeesList();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [roeData, setROEData] = useState({
    lastDayWorked: '',
    reasonForIssuing: '',
    finalPayPeriodEnd: '',
    comments: ''
  });

  const handleGenerateROE = async () => {
    if (!selectedEmployee) return;

    try {
      await generateROESlip(selectedEmployee, roeData);
      setShowGenerateDialog(false);
      setSelectedEmployee('');
      setROEData({
        lastDayWorked: '',
        reasonForIssuing: '',
        finalPayPeriodEnd: '',
        comments: ''
      });
    } catch (error) {
      console.error('Failed to generate ROE:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'generated': return 'bg-blue-100 text-blue-800';
      case 'submitted': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const terminatedEmployees = employees.filter(emp => emp.status === 'Terminated');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Record of Employment (ROE) Manager
          </CardTitle>
          <CardDescription>
            Generate and manage ROE slips for terminated employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {roeSlips.length} ROE slips on file
            </div>
            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate ROE
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Generate New ROE Slip</DialogTitle>
                  <DialogDescription>
                    Generate a Record of Employment for a terminated employee
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select terminated employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {terminatedEmployees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.id} - {employee.firstName} {employee.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Last Day Worked</Label>
                    <Input
                      type="date"
                      value={roeData.lastDayWorked}
                      onChange={(e) => setROEData(prev => ({
                        ...prev,
                        lastDayWorked: e.target.value
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Reason for Issuing</Label>
                    <Select 
                      value={roeData.reasonForIssuing} 
                      onValueChange={(value) => setROEData(prev => ({
                        ...prev,
                        reasonForIssuing: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROE_REASONS).map(([code, description]) => (
                          <SelectItem key={code} value={code}>
                            {code} - {description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Final Pay Period End</Label>
                    <Input
                      type="date"
                      value={roeData.finalPayPeriodEnd}
                      onChange={(e) => setROEData(prev => ({
                        ...prev,
                        finalPayPeriodEnd: e.target.value
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Comments (Optional)</Label>
                    <Textarea
                      placeholder="Additional comments for ROE"
                      value={roeData.comments}
                      onChange={(e) => setROEData(prev => ({
                        ...prev,
                        comments: e.target.value
                      }))}
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={handleGenerateROE}
                    disabled={!selectedEmployee || !roeData.lastDayWorked || !roeData.reasonForIssuing || loading}
                    className="w-full"
                  >
                    {loading ? 'Generating...' : 'Generate ROE Slip'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ROE Slips</CardTitle>
          <CardDescription>
            All generated ROE slips for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roeSlips.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ROE Number</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Last Day Worked</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Insurable Earnings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roeSlips.map((roe) => (
                  <TableRow key={roe.id}>
                    <TableCell className="font-mono font-semibold">
                      {roe.roe_number}
                    </TableCell>
                    <TableCell>
                      {(roe as any).employees?.employee_number} - {(roe as any).employees?.first_name} {(roe as any).employees?.last_name}
                    </TableCell>
                    <TableCell>
                      {format(new Date(roe.last_day_worked), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{roe.reason_for_issuing}</div>
                        <div className="text-muted-foreground">
                          {ROE_REASONS[roe.reason_for_issuing as keyof typeof ROE_REASONS]}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      ${roe.total_insurable_earnings.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(roe.status)}>
                        {roe.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(roe.generated_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No ROE slips generated</p>
              <p className="text-sm">ROE slips will be automatically generated when employees are terminated</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}