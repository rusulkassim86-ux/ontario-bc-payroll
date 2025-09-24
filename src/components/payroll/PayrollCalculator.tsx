import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calculator, Play, Save } from 'lucide-react';

interface PayrollCalculatorProps {
  employeeId?: string;
  className?: string;
}

interface PayrollCalculation {
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  grossPay: number;
  federalTax: number;
  provincialTax: number;
  cpp: number;
  ei: number;
  unionDues: number;
  totalDeductions: number;
  netPay: number;
}

export function PayrollCalculator({ employeeId, className }: PayrollCalculatorProps) {
  const [calculation, setCalculation] = useState<PayrollCalculation>({
    regularHours: 80,
    overtimeHours: 4,
    hourlyRate: 32.50,
    grossPay: 0,
    federalTax: 0,
    provincialTax: 0,
    cpp: 0,
    ei: 0,
    unionDues: 0,
    totalDeductions: 0,
    netPay: 0,
  });

  const calculatePayroll = () => {
    const { regularHours, overtimeHours, hourlyRate } = calculation;
    
    // Basic gross pay calculation
    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * hourlyRate * 1.5;
    const grossPay = regularPay + overtimePay;
    
    // Tax calculations (simplified for demo)
    const federalTax = grossPay * 0.15; // 15% federal tax
    const provincialTax = grossPay * 0.0505; // 5.05% provincial tax (ON)
    const cpp = Math.min(grossPay * 0.0595, 68.92); // CPP calculation
    const ei = Math.min(grossPay * 0.0229, 31.00); // EI calculation
    const unionDues = Math.min(grossPay * 0.025, 150); // Union dues
    
    const totalDeductions = federalTax + provincialTax + cpp + ei + unionDues;
    const netPay = grossPay - totalDeductions;
    
    setCalculation(prev => ({
      ...prev,
      grossPay: Number(grossPay.toFixed(2)),
      federalTax: Number(federalTax.toFixed(2)),
      provincialTax: Number(provincialTax.toFixed(2)),
      cpp: Number(cpp.toFixed(2)),
      ei: Number(ei.toFixed(2)),
      unionDues: Number(unionDues.toFixed(2)),
      totalDeductions: Number(totalDeductions.toFixed(2)),
      netPay: Number(netPay.toFixed(2)),
    }));
  };

  const updateField = (field: keyof PayrollCalculation, value: number) => {
    setCalculation(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Card className={`shadow-card ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Payroll Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="regularHours">Regular Hours</Label>
            <Input
              id="regularHours"
              type="number"
              step="0.5"
              value={calculation.regularHours}
              onChange={(e) => updateField('regularHours', Number(e.target.value))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="overtimeHours">Overtime Hours</Label>
            <Input
              id="overtimeHours"
              type="number"
              step="0.5"
              value={calculation.overtimeHours}
              onChange={(e) => updateField('overtimeHours', Number(e.target.value))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Hourly Rate</Label>
            <Input
              id="hourlyRate"
              type="number"
              step="0.01"
              value={calculation.hourlyRate}
              onChange={(e) => updateField('hourlyRate', Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={calculatePayroll} className="bg-gradient-primary">
            <Play className="w-4 h-4 mr-2" />
            Calculate
          </Button>
          <Button variant="outline">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>

        <Separator />

        {/* Results Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
              <div className="text-sm text-muted-foreground">Gross Pay</div>
              <div className="text-xl font-bold text-success">${calculation.grossPay.toLocaleString()}</div>
            </div>
            
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="text-sm text-muted-foreground">Net Pay</div>
              <div className="text-xl font-bold text-primary">${calculation.netPay.toLocaleString()}</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Deductions Breakdown</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Federal Tax:</span>
                <span>${calculation.federalTax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Provincial Tax:</span>
                <span>${calculation.provincialTax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>CPP:</span>
                <span>${calculation.cpp.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>EI:</span>
                <span>${calculation.ei.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Union Dues:</span>
                <span>${calculation.unionDues.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Total Deductions:</span>
                <span>${calculation.totalDeductions.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}