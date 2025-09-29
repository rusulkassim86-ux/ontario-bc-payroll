import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LegacyEmployee, PayRunLine, YearEndSummary } from '@/types/employee';

interface AccumulatorsTabProps {
  employee: LegacyEmployee;
  payHistory: PayRunLine[];
  yearEndSummary: YearEndSummary | null;
}

export function AccumulatorsTab({ employee, payHistory, yearEndSummary }: AccumulatorsTabProps) {
  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
  };

  const currentYear = new Date().getFullYear();

  // Mock vacation balance calculation
  const vacationBalance = {
    accrued: 15.5,
    used: 8.0,
    available: 7.5,
    carryOver: 2.0
  };

  const sickBalance = {
    accrued: 10.0,
    used: 3.5,
    available: 6.5
  };

  return (
    <div className="space-y-6">
      {/* Year-to-Date Earnings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Year-to-Date Earnings ({currentYear})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total Employment Income</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(yearEndSummary?.total_employment_income)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">CPP Pensionable Earnings</div>
              <div className="text-lg font-semibold">
                {formatCurrency(yearEndSummary?.total_cpp_pensionable)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">EI Insurable Earnings</div>
              <div className="text-lg font-semibold">
                {formatCurrency(yearEndSummary?.total_ei_insurable)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Year-to-Date Deductions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Year-to-Date Deductions ({currentYear})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Income Tax</div>
              <div className="text-lg font-semibold text-red-600">
                {formatCurrency(yearEndSummary?.total_income_tax)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">CPP Contributions</div>
              <div className="text-lg font-semibold text-red-600">
                {formatCurrency(yearEndSummary?.total_cpp_contributions)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">EI Premiums</div>
              <div className="text-lg font-semibold text-red-600">
                {formatCurrency(yearEndSummary?.total_ei_premiums)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Union Dues</div>
              <div className="text-lg font-semibold text-red-600">
                {formatCurrency(yearEndSummary?.total_union_dues)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits Deductions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Year-to-Date Benefits ({currentYear})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Pension Contributions</div>
              <div className="text-lg font-semibold text-blue-600">
                {formatCurrency(yearEndSummary?.total_rpp_contributions)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Health Benefits</div>
              <div className="text-lg font-semibold text-blue-600">
                $1,245.00
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Dental Benefits</div>
              <div className="text-lg font-semibold text-blue-600">
                $456.00
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vacation Balance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vacation Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Accrued</div>
                <div className="text-lg font-semibold text-green-600">
                  {vacationBalance.accrued} days
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Used</div>
                <div className="text-lg font-semibold text-red-600">
                  {vacationBalance.used} days
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Available</div>
                <div className="text-lg font-semibold text-blue-600">
                  {vacationBalance.available} days
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Carry Over</div>
                <div className="text-lg font-semibold">
                  {vacationBalance.carryOver} days
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Vacation Usage</span>
                <span>{((vacationBalance.used / vacationBalance.accrued) * 100).toFixed(1)}%</span>
              </div>
              <Progress value={(vacationBalance.used / vacationBalance.accrued) * 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sick Leave Balance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sick Leave Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Accrued</div>
                <div className="text-lg font-semibold text-green-600">
                  {sickBalance.accrued} days
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Used</div>
                <div className="text-lg font-semibold text-red-600">
                  {sickBalance.used} days
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Available</div>
                <div className="text-lg font-semibold text-blue-600">
                  {sickBalance.available} days
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sick Leave Usage</span>
                <span>{((sickBalance.used / sickBalance.accrued) * 100).toFixed(1)}%</span>
              </div>
              <Progress value={(sickBalance.used / sickBalance.accrued) * 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Pay History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Pay History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payHistory.length > 0 ? (
              payHistory.slice(0, 5).map((payLine) => (
                <div key={payLine.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Pay Period</div>
                    <div className="font-medium">
                      {payLine.pay_run?.pay_calendar?.period_start && payLine.pay_run?.pay_calendar?.period_end
                        ? `${new Date(payLine.pay_run.pay_calendar.period_start).toLocaleDateString()} - ${new Date(payLine.pay_run.pay_calendar.period_end).toLocaleDateString()}`
                        : 'N/A'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Gross Pay</div>
                    <div className="font-medium text-green-600">
                      {formatCurrency(payLine.gross_pay)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Net Pay</div>
                    <div className="font-medium text-blue-600">
                      {formatCurrency(payLine.net_pay)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge variant="default">Processed</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No pay history available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}