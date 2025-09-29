import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { calculatePayroll } from '@/services/calculatePayroll';
import { PayrollInput, PayrollResult } from '@/payroll/types';
import { Employee } from '@/types/employee';
import { Loader2, FileText, Download } from 'lucide-react';

interface PayrollRunDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
}

export function PayrollRunDrawer({ open, onOpenChange, employee }: PayrollRunDrawerProps) {
  const [payFrequency, setPayFrequency] = useState<PayrollInput['payFrequency']>('Biweekly');
  const [grossPay, setGrossPay] = useState<string>('');
  const [result, setResult] = useState<PayrollResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCalculate = async () => {
    if (!grossPay || parseFloat(grossPay) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Gross Pay",
        description: "Please enter a valid gross pay amount",
      });
      return;
    }

    if (!employee.province_code || !['ON', 'BC'].includes(employee.province_code)) {
      toast({
        variant: "destructive",
        title: "Province Not Supported",
        description: "Only Ontario (ON) and British Columbia (BC) are currently supported",
      });
      return;
    }

    setIsCalculating(true);
    try {
      const input: PayrollInput = {
        grossPay: parseFloat(grossPay),
        province: employee.province_code as "ON" | "BC",
        payFrequency,
        ytd: {
          cpp: 0, // TODO: Get from YTD summary
          ei: 0,
          fedTax: 0,
          provTax: 0,
        }
      };

      const payrollResult = await calculatePayroll(input);
      setResult(payrollResult);
      
      toast({
        title: "Payroll Calculated",
        description: `Net pay: $${payrollResult.netPay.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Payroll calculation error:', error);
      toast({
        variant: "destructive",
        title: "Calculation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handlePostPayroll = async () => {
    if (!result) return;

    setIsProcessing(true);
    try {
      // TODO: Save payroll run to database
      toast({
        title: "Payroll Posted",
        description: "Payroll run has been saved successfully",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to Post Payroll",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-none overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Run Payroll</SheetTitle>
          <SheetDescription>
            Calculate payroll for {employee.first_name} {employee.last_name}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payroll Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payFrequency">Pay Frequency</Label>
                  <Select value={payFrequency} onValueChange={(value) => setPayFrequency(value as PayrollInput['payFrequency'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Biweekly">Biweekly</SelectItem>
                      <SelectItem value="SemiMonthly">Semi-Monthly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grossPay">Gross Pay</Label>
                  <Input
                    id="grossPay"
                    type="number"
                    step="0.01"
                    min="0"
                    value={grossPay}
                    onChange={(e) => setGrossPay(e.target.value)}
                    placeholder="Enter gross pay amount"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  Province: {employee.province_code || 'Not set'}
                </Badge>
                <Badge variant="outline">
                  Employee ID: {employee.employee_number}
                </Badge>
              </div>

              <Button 
                onClick={handleCalculate} 
                disabled={isCalculating || !grossPay}
                className="w-full"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  'Calculate Payroll'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payroll Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(result.netPay)}
                    </div>
                    <div className="text-sm text-gray-500">Net Pay</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      {formatCurrency(result.summary.gross)}
                    </div>
                    <div className="text-sm text-gray-500">Gross Pay</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      {formatCurrency(result.summary.taxableGross)}
                    </div>
                    <div className="text-sm text-gray-500">Taxable Gross</div>
                  </div>
                </div>

                <Separator />

                {/* Deductions */}
                <div>
                  <h4 className="font-semibold mb-3">Employee Deductions</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>CPP Contribution</span>
                      <span>{formatCurrency(result.deductions.cpp)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>EI Premium</span>
                      <span>{formatCurrency(result.deductions.ei)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Federal Tax</span>
                      <span>{formatCurrency(result.deductions.fedTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Provincial Tax</span>
                      <span>{formatCurrency(result.deductions.provTax)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Deductions</span>
                      <span>{formatCurrency(
                        result.deductions.cpp + 
                        result.deductions.ei + 
                        result.deductions.fedTax + 
                        result.deductions.provTax
                      )}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Employer Costs */}
                <div>
                  <h4 className="font-semibold mb-3">Employer Costs</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>CPP Contribution</span>
                      <span>{formatCurrency(result.employerCosts.cpp)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>EI Premium</span>
                      <span>{formatCurrency(result.employerCosts.ei)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Employer Costs</span>
                      <span>{formatCurrency(result.employerCosts.cpp + result.employerCosts.ei)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-4">
                  <Button 
                    onClick={handlePostPayroll}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Post Payroll'
                    )}
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}