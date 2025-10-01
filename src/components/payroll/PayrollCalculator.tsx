import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Calculator, Download, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
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
  const [employeeData, setEmployeeData] = useState<EmployeeData[]>([]);
  const [calculations, setCalculations] = useState<TaxCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [payPeriod, setPayPeriod] = useState<string>('26'); // Bi-weekly default
  const [activePack, setActivePack] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadActiveTaxPack();
  }, []);

  const loadActiveTaxPack = async () => {
    const { data: pack } = await supabase
      .from('cra_year_packs')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (pack) {
      setActivePack(pack);
    } else {
      toast({
        title: "No active tax pack",
        description: "Please upload a CRA Year Pack to enable calculations",
        variant: "destructive",
      });
    }
  };

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

  const validateEmployeeData = (): string[] => {
    const errors: string[] = [];
    
    employeeData.forEach((emp, index) => {
      if (!emp.province || (emp.province !== 'ON' && emp.province !== 'BC')) {
        errors.push(`Employee ${emp.name}: Missing or invalid province (must be ON or BC)`);
      }
      if (!emp.taxId) {
        errors.push(`Employee ${emp.name}: Missing SIN/Tax ID`);
      }
      if (emp.grossPay <= 0) {
        errors.push(`Employee ${emp.name}: Invalid gross pay amount`);
      }
    });
    
    return errors;
  };

  const calculateTaxes = (grossPay: number, payPeriodsPerYear: number, province: string): Partial<TaxCalculation> => {
    if (!activePack?.pack_data) {
      return {
        cppEmployee: 0,
        cppEmployer: 0,
        eiEmployee: 0,
        eiEmployer: 0,
        federalTax: 0,
        provincialTax: 0,
      };
    }

    const { cpp, ei } = activePack.pack_data;
    const annualGross = grossPay * payPeriodsPerYear;

    // CPP calculations using active pack rates
    const cppRate = cpp?.employee_rate || 0.0595;
    const cppExemption = cpp?.basic_exemption || 3500;
    const cppMax = cpp?.max_pensionable || 68500;
    const cppPensionable = Math.min(annualGross, cppMax) - cppExemption;
    const cppEmployee = Math.max(0, (cppPensionable * cppRate) / payPeriodsPerYear);
    const cppEmployer = cppEmployee;

    // EI calculations using active pack rates
    const eiRateEmployee = ei?.employee_rate || 0.0166;
    const eiRateEmployer = ei?.employer_rate || 0.02324;
    const eiMax = ei?.max_insurable || 63600;
    const eiInsurable = Math.min(annualGross, eiMax);
    const eiEmployee = (eiInsurable * eiRateEmployee) / payPeriodsPerYear;
    const eiEmployer = (eiInsurable * eiRateEmployer) / payPeriodsPerYear;

    // Tax calculations using active pack brackets
    const federalBrackets = activePack.pack_data.federal_tax || [];
    const provincialBrackets = activePack.pack_data.provincial_tax?.[province] || [];
    
    const federalTax = calculateTaxFromBrackets(annualGross, federalBrackets) / payPeriodsPerYear;
    const provincialTax = calculateTaxFromBrackets(annualGross, provincialBrackets) / payPeriodsPerYear;

    return {
      cppEmployee: Math.round(cppEmployee * 100) / 100,
      cppEmployer: Math.round(cppEmployer * 100) / 100,
      eiEmployee: Math.round(eiEmployee * 100) / 100,
      eiEmployer: Math.round(eiEmployer * 100) / 100,
      federalTax: Math.round(federalTax * 100) / 100,
      provincialTax: Math.round(provincialTax * 100) / 100,
    };
  };

  const calculateTaxFromBrackets = (annualIncome: number, brackets: any[]): number => {
    if (!brackets || brackets.length === 0) return annualIncome * 0.15; // Fallback
    
    let tax = 0;
    let previousThreshold = 0;
    
    for (const bracket of brackets) {
      const threshold = bracket.upTo || Infinity;
      const rate = bracket.rate || 0;
      
      if (annualIncome > previousThreshold) {
        const taxableInThisBracket = Math.min(annualIncome, threshold) - previousThreshold;
        tax += taxableInThisBracket * rate;
        previousThreshold = threshold;
      }
      
      if (annualIncome <= threshold) break;
    }
    
    return tax;
  };

  const processPayroll = async () => {
    if (employeeData.length === 0) {
      toast({
        title: "Missing data",
        description: "Please upload employee file",
        variant: "destructive",
      });
      return;
    }

    if (!activePack) {
      toast({
        title: "No active tax pack",
        description: "Please upload a CRA Year Pack first",
        variant: "destructive",
      });
      return;
    }

    // Validate employee data
    const errors = validateEmployeeData();
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      toast({
        title: "Validation errors",
        description: `${errors.length} employee(s) have missing or invalid data`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const payPeriodsPerYear = parseInt(payPeriod);
    
    const results: TaxCalculation[] = employeeData.map(employee => {
      const taxes = calculateTaxes(employee.grossPay, payPeriodsPerYear, employee.province);
      
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
    
    // Log calculation
    console.log(`Payroll calculated using CRA Year Pack ${activePack.tax_year}`, {
      pack_id: activePack.id,
      tax_year: activePack.tax_year,
      employee_count: results.length,
      pay_periods: payPeriodsPerYear
    });
    
    toast({
      title: "Payroll calculated",
      description: `Processed ${results.length} employees using ${activePack.tax_year} tax rates`,
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
      {/* Active Pack Info */}
      {activePack && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Active Tax Year:</strong> {activePack.tax_year}
            {activePack.tax_year !== new Date().getFullYear() && (
              <span className="text-destructive"> (Warning: Not current year)</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Data Validation Errors:</strong>
            <ul className="list-disc list-inside mt-2">
              {validationErrors.slice(0, 10).map((error, i) => (
                <li key={i} className="text-sm">{error}</li>
              ))}
              {validationErrors.length > 10 && (
                <li className="text-sm">...and {validationErrors.length - 10} more</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            CRA Payroll Calculator
          </CardTitle>
          <CardDescription>
            Upload employee master data. Calculations use the active CRA Year Pack ({activePack?.tax_year || 'none'}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div>
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
              disabled={loading || employeeData.length === 0 || !activePack}
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