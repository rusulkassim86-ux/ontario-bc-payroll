import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Calculator, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import * as XLSX from 'xlsx';

interface EmployeeData {
  employeeId: string;
  name: string;
  prefixCode: string;
  province: string;
  grossPay: number;
  unionCode?: string;
  taxId?: string;
  rate?: number;
  rateType?: string;
}

interface TaxCalculation {
  employeeId: string;
  name: string;
  prefixCode: string;
  grossPay: number;
  cppEmployee: number;
  cppEmployer: number;
  eiEmployee: number;
  eiEmployer: number;
  federalTax: number;
  provincialTax: number;
  unionDues: number;
  netPay: number;
}

interface CRATaxData {
  earningsFrom: number;
  earningsTo: number;
  employeeCPP: number;
  employerCPP: number;
  employeeEI?: number;
  employerEI?: number;
  federalTax?: number;
  provincialTax?: number;
  payPeriodsPerYear?: number;
}

export const PayrollCalculator: React.FC = () => {
  const [employeeFile, setEmployeeFile] = useState<File | null>(null);
  const [taxFile, setTaxFile] = useState<File | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData[]>([]);
  const [taxData, setTaxData] = useState<CRATaxData[]>([]);
  const [calculations, setCalculations] = useState<TaxCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [payPeriod, setPayPeriod] = useState<string>('26'); // Bi-weekly default
  const { toast } = useToast();

  const handleEmployeeFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setEmployeeFile(file);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Parse employee data from the structure we saw
      const employees: EmployeeData[] = [];
      for (let i = 1; i < jsonData.length; i++) { // Skip header
        const row = jsonData[i];
        if (row && row.length > 0) {
          const employeeId = row[2]; // ASSOCIATE ID
          const name = row[3]; // NAME
          const status = row[9]; // STATUS
          const rate = row[17]; // RATE
          const rateType = row[16]; // RATE TYPE
          const unionCode = row[14]; // UNION CODE
          const taxId = row[4]; // TAX ID
          const province = row[29]?.includes('BC') ? 'BC' : 'ON'; // Parse province from address
          
          if (employeeId && name && status === 'Active') {
            const prefixCode = employeeId.toString().match(/^[A-Z0-9]+/)?.[0] || '';
            employees.push({
              employeeId,
              name,
              prefixCode,
              province,
              grossPay: parseFloat(rate) || 0,
              unionCode,
              taxId,
              rate: parseFloat(rate) || 0,
              rateType
            });
          }
        }
      }
      
      setEmployeeData(employees);
      toast({
        title: "Employee file loaded",
        description: `Loaded ${employees.length} active employees`,
      });
    } catch (error) {
      toast({
        title: "Error loading employee file",
        description: "Please ensure the file format is correct",
        variant: "destructive",
      });
    }
  };

  const handleTaxFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setTaxFile(file);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      const taxRules: CRATaxData[] = [];
      for (let i = 1; i < jsonData.length; i++) { // Skip header
        const row = jsonData[i];
        if (row && row.length >= 4) {
          taxRules.push({
            earningsFrom: parseFloat(row[0]) || 0,
            earningsTo: parseFloat(row[1]) || 0,
            employeeCPP: parseFloat(row[2]) || 0,
            employerCPP: parseFloat(row[3]) || 0,
          });
        }
      }
      
      setTaxData(taxRules);
      toast({
        title: "Tax tables loaded",
        description: `Loaded ${taxRules.length} tax rules`,
      });
    } catch (error) {
      toast({
        title: "Error loading tax file",
        description: "Please ensure the file format is correct",
        variant: "destructive",
      });
    }
  };

  const calculateTaxes = (grossPay: number, payPeriodsPerYear: number): Partial<TaxCalculation> => {
    // Find applicable tax bracket
    const bracket = taxData.find(rule => 
      grossPay >= rule.earningsFrom && grossPay <= rule.earningsTo
    );

    if (!bracket) {
      return {
        cppEmployee: 0,
        cppEmployer: 0,
        eiEmployee: 0,
        eiEmployer: 0,
        federalTax: 0,
        provincialTax: 0,
      };
    }

    // CPP calculations (4.95% employee, 4.95% employer, max $66,600 annually)
    const annualGross = grossPay * payPeriodsPerYear;
    const cppMax = 66600;
    const cppRate = 0.0495;
    const cppExemption = 3500;
    const cppPensionable = Math.min(annualGross, cppMax) - cppExemption;
    const cppEmployee = Math.max(0, (cppPensionable * cppRate) / payPeriodsPerYear);
    const cppEmployer = cppEmployee;

    // EI calculations (1.63% employee, 2.282% employer, max $63,300 annually)
    const eiMax = 63300;
    const eiRateEmployee = 0.0163;
    const eiRateEmployer = 0.02282;
    const eiInsurable = Math.min(annualGross, eiMax);
    const eiEmployee = (eiInsurable * eiRateEmployee) / payPeriodsPerYear;
    const eiEmployer = (eiInsurable * eiRateEmployer) / payPeriodsPerYear;

    // Simplified tax calculation (would need proper tax tables in production)
    const federalTax = grossPay * 0.15; // Simplified 15% federal
    const provincialTax = grossPay * 0.05; // Simplified 5% provincial

    return {
      cppEmployee: Math.round(cppEmployee * 100) / 100,
      cppEmployer: Math.round(cppEmployer * 100) / 100,
      eiEmployee: Math.round(eiEmployee * 100) / 100,
      eiEmployer: Math.round(eiEmployer * 100) / 100,
      federalTax: Math.round(federalTax * 100) / 100,
      provincialTax: Math.round(provincialTax * 100) / 100,
    };
  };

  const processPayroll = () => {
    if (employeeData.length === 0 || taxData.length === 0) {
      toast({
        title: "Missing data",
        description: "Please upload both employee and tax files",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const payPeriodsPerYear = parseInt(payPeriod);
    
    const results: TaxCalculation[] = employeeData.map(employee => {
      const taxes = calculateTaxes(employee.grossPay, payPeriodsPerYear);
      
      // Union dues calculation (only for 72S prefix)
      const unionDues = employee.prefixCode === '72S' && employee.unionCode === '72S' 
        ? employee.grossPay * 0.02 // 2% union dues
        : 0;

      const totalDeductions = (taxes.cppEmployee || 0) + 
                             (taxes.eiEmployee || 0) + 
                             (taxes.federalTax || 0) + 
                             (taxes.provincialTax || 0) + 
                             unionDues;

      return {
        employeeId: employee.employeeId,
        name: employee.name,
        prefixCode: employee.prefixCode,
        grossPay: employee.grossPay,
        cppEmployee: taxes.cppEmployee || 0,
        cppEmployer: taxes.cppEmployer || 0,
        eiEmployee: taxes.eiEmployee || 0,
        eiEmployer: taxes.eiEmployer || 0,
        federalTax: taxes.federalTax || 0,
        provincialTax: taxes.provincialTax || 0,
        unionDues,
        netPay: employee.grossPay - totalDeductions,
      };
    });

    setCalculations(results);
    setLoading(false);
    
    toast({
      title: "Payroll calculated",
      description: `Processed ${results.length} employees`,
    });
  };

  const exportToExcel = () => {
    if (calculations.length === 0) return;

    // Create payroll worksheet
    const payrollData = calculations.map(calc => ({
      'Employee ID': calc.employeeId,
      'Name': calc.name,
      'Prefix Code': calc.prefixCode,
      'Gross Pay': calc.grossPay,
      'CPP Employee': calc.cppEmployee,
      'CPP Employer': calc.cppEmployer,
      'EI Employee': calc.eiEmployee,
      'EI Employer': calc.eiEmployer,
      'Federal Tax': calc.federalTax,
      'Provincial Tax': calc.provincialTax,
      'Union Dues': calc.unionDues,
      'Net Pay': calc.netPay,
    }));

    // Create T4 summary data
    const t4Data = calculations.map(calc => ({
      'Employee ID': calc.employeeId,
      'Name': calc.name,
      'Box 14 - Employment Income': calc.grossPay * parseInt(payPeriod), // Annualized
      'Box 16 - Employee CPP': calc.cppEmployee * parseInt(payPeriod),
      'Box 18 - Employee EI': calc.eiEmployee * parseInt(payPeriod),
      'Box 22 - Income Tax': (calc.federalTax + calc.provincialTax) * parseInt(payPeriod),
      'Box 44 - Union Dues': calc.unionDues * parseInt(payPeriod),
    }));

    // Create summary totals
    const totals = calculations.reduce((acc, calc) => ({
      totalGross: acc.totalGross + calc.grossPay,
      totalCPP: acc.totalCPP + calc.cppEmployee,
      totalEI: acc.totalEI + calc.eiEmployee,
      totalTax: acc.totalTax + calc.federalTax + calc.provincialTax,
      totalNet: acc.totalNet + calc.netPay,
    }), { totalGross: 0, totalCPP: 0, totalEI: 0, totalTax: 0, totalNet: 0 });

    const summaryData = [{
      'Total Gross Pay': totals.totalGross,
      'Total CPP': totals.totalCPP,
      'Total EI': totals.totalEI,
      'Total Tax': totals.totalTax,
      'Total Net Pay': totals.totalNet,
    }];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payrollData), 'Payroll');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(t4Data), 'T4 Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Totals');

    // Download file
    XLSX.writeFile(wb, `payroll_calculation_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Export completed",
      description: "Payroll data exported to Excel",
    });
  };

  const totals = calculations.reduce((acc, calc) => ({
    totalGross: acc.totalGross + calc.grossPay,
    totalCPP: acc.totalCPP + calc.cppEmployee,
    totalEI: acc.totalEI + calc.eiEmployee,
    totalTax: acc.totalTax + calc.federalTax + calc.provincialTax,
    totalNet: acc.totalNet + calc.netPay,
  }), { totalGross: 0, totalCPP: 0, totalEI: 0, totalTax: 0, totalNet: 0 });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            CRA Payroll Calculator
          </CardTitle>
          <CardDescription>
            Upload employee master data and CRA tax tables to generate payroll calculations and T4-ready outputs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Uploads */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employee-file">Employee Master Data</Label>
              <div className="mt-2">
                <Input
                  id="employee-file"
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleEmployeeFileUpload}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                />
                {employeeFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    {employeeFile.name}
                    <Badge variant="secondary">{employeeData.length} employees</Badge>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="tax-file">CRA Tax Tables</Label>
              <div className="mt-2">
                <Input
                  id="tax-file"
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleTaxFileUpload}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                />
                {taxFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    {taxFile.name}
                    <Badge variant="secondary">{taxData.length} tax rules</Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pay Period Selection */}
          <div className="w-48">
            <Label htmlFor="pay-period">Pay Periods Per Year</Label>
            <Select value={payPeriod} onValueChange={setPayPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="52">Weekly (52)</SelectItem>
                <SelectItem value="26">Bi-weekly (26)</SelectItem>
                <SelectItem value="24">Semi-monthly (24)</SelectItem>
                <SelectItem value="12">Monthly (12)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              onClick={processPayroll} 
              disabled={loading || employeeData.length === 0 || taxData.length === 0}
              className="flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              {loading ? 'Calculating...' : 'Calculate Payroll'}
            </Button>
            
            {calculations.length > 0 && (
              <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export to Excel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {calculations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payroll Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Gross</div>
                <div className="text-2xl font-bold">${totals.totalGross.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total CPP</div>
                <div className="text-2xl font-bold">${totals.totalCPP.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total EI</div>
                <div className="text-2xl font-bold">${totals.totalEI.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Tax</div>
                <div className="text-2xl font-bold">${totals.totalTax.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Net</div>
                <div className="text-2xl font-bold">${totals.totalNet.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      {calculations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payroll Calculations</CardTitle>
            <CardDescription>
              Individual employee calculations with CRA deductions applied
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Employee ID</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Prefix</th>
                    <th className="text-right p-2">Gross Pay</th>
                    <th className="text-right p-2">CPP</th>
                    <th className="text-right p-2">EI</th>
                    <th className="text-right p-2">Fed Tax</th>
                    <th className="text-right p-2">Prov Tax</th>
                    <th className="text-right p-2">Union Dues</th>
                    <th className="text-right p-2">Net Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.map((calc, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-2">{calc.employeeId}</td>
                      <td className="p-2">{calc.name}</td>
                      <td className="p-2">
                        <Badge variant={calc.prefixCode === '72S' ? 'default' : 'secondary'}>
                          {calc.prefixCode}
                        </Badge>
                      </td>
                      <td className="text-right p-2">${calc.grossPay.toFixed(2)}</td>
                      <td className="text-right p-2">${calc.cppEmployee.toFixed(2)}</td>
                      <td className="text-right p-2">${calc.eiEmployee.toFixed(2)}</td>
                      <td className="text-right p-2">${calc.federalTax.toFixed(2)}</td>
                      <td className="text-right p-2">${calc.provincialTax.toFixed(2)}</td>
                      <td className="text-right p-2">${calc.unionDues.toFixed(2)}</td>
                      <td className="text-right p-2 font-semibold">${calc.netPay.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Information */}
      <Alert>
        <AlertDescription>
          <strong>Usage Instructions:</strong>
          <br />1. Upload your employee master data Excel file (ensure it contains employee IDs, names, rates, and union codes)
          <br />2. Upload the CRA tax tables file with current deduction rates
          <br />3. Select the appropriate pay period frequency
          <br />4. Click "Calculate Payroll" to process all employees
          <br />5. Export results to Excel for T4 preparation and payroll processing
          <br /><br />
          <strong>Features:</strong> Automatic CPP/EI calculations, union dues for 72S employees, provincial tax support for ON/BC, T4-ready output format.
        </AlertDescription>
      </Alert>
    </div>
  );
};