import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Employee } from '@/types/employee';
import { PayrollRunDrawer } from './PayrollRunDrawer';
import { Calculator, FileText, Clock, DollarSign } from 'lucide-react';

interface PayrollTabProps {
  employee: Employee;
}

export function PayrollTab({ employee }: PayrollTabProps) {
  const [showPayrollDrawer, setShowPayrollDrawer] = useState(false);

  // Mock data for recent payroll runs
  const recentPayrollRuns = [
    {
      id: '1',
      payPeriod: '2025-01-01 to 2025-01-15',
      grossPay: 2500.00,
      netPay: 1876.45,
      runDate: '2025-01-16',
      status: 'posted'
    },
    {
      id: '2',
      payPeriod: '2024-12-16 to 2024-12-31',
      grossPay: 2500.00,
      netPay: 1876.45,
      runDate: '2025-01-02',
      status: 'posted'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Payroll Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(employee.annual_salary || employee.salary || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {employee.annual_salary ? 'Salaried' : 'Hourly'} • {employee.pay_frequency || 'Biweekly'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pay Frequency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employee.pay_frequency || 'Biweekly'}</div>
            <p className="text-xs text-muted-foreground">
              Standard Hours: {employee.standard_hours || 40}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Province</CardTitle>
            <Badge variant="outline">{employee.province_code || 'Not Set'}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employee.province_code || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              Tax jurisdiction for calculations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button 
              onClick={() => setShowPayrollDrawer(true)}
              className="flex items-center space-x-2"
            >
              <Calculator className="h-4 w-4" />
              <span>Run Payroll</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>View Pay Stubs</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Payroll Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payroll Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPayrollRuns.length > 0 ? (
              recentPayrollRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{run.payPeriod}</div>
                    <div className="text-sm text-gray-500">Run on {run.runDate}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${run.netPay.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">
                      Gross: ${run.grossPay.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={run.status === 'posted' ? 'default' : 'secondary'}
                    >
                      {run.status}
                    </Badge>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No payroll runs found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* YTD Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Year-to-Date Summary (2025)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold">$0.00</div>
              <div className="text-sm text-gray-500">Gross Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">$0.00</div>
              <div className="text-sm text-gray-500">CPP Contributions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">$0.00</div>
              <div className="text-sm text-gray-500">EI Premiums</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">$0.00</div>
              <div className="text-sm text-gray-500">Income Tax</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PayrollRunDrawer 
        open={showPayrollDrawer}
        onOpenChange={setShowPayrollDrawer}
        employee={employee}
      />
    </div>
  );
}