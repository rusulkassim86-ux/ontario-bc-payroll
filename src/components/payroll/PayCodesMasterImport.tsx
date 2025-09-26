import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { usePayCodesMaster } from '@/hooks/usePayCodesMaster';
import * as XLSX from 'xlsx';

interface ParsedPayrollItem {
  payrollItem: string;
  code: string;
  companyScope: string;
  description: string;
  originalRow: number;
}

export function PayCodesMasterImport() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedPayrollItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
  const { importPayrollItems, deriveType } = usePayCodesMaster();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setErrors([]);
      setImportComplete(false);
      parseFile(selectedFile);
    }
  };

  const parseFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];

      const parsed: ParsedPayrollItem[] = [];
      let currentPayrollItem = '';
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Skip empty rows
        if (!row || row.every(cell => !cell)) continue;
        
        // Check if this is a payroll item header (Earnings, Deductions, etc.)
        if (row[0] && !row[1] && (row[0] === 'Earnings' || row[0] === 'Deductions')) {
          currentPayrollItem = row[0];
          continue;
        }
        
        // Skip header row and other non-data rows
        if (row[0] === 'Payroll Item' || !row[1]) continue;
        
        // Parse data row: [PayrollItem, Code, CompanyScope, Description, ...]
        if (row[1] && currentPayrollItem) {
          parsed.push({
            payrollItem: currentPayrollItem,
            code: row[1].toString().trim(),
            companyScope: row[2]?.toString().trim() || 'All companies',
            description: row[3]?.toString().trim() || row[1].toString().trim(),
            originalRow: i + 1
          });
        }
      }

      setParsedData(parsed);
      
      if (parsed.length === 0) {
        setErrors(['No valid pay code data found in the file. Please check the format.']);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      setErrors(['Failed to parse file. Please ensure it\'s a valid Excel file.']);
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);
    
    try {
      await importPayrollItems(parsedData);
      setImportProgress(100);
      setImportComplete(true);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Import failed']);
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setParsedData([]);
    setImportComplete(false);
    setErrors([]);
    setImportProgress(0);
  };

  const getTypeStats = () => {
    const stats: Record<string, number> = {};
    parsedData.forEach(item => {
      const type = item.payrollItem === 'Deductions' ? 'Deduction' : 
                   deriveType(item.code, item.description);
      stats[type] = (stats[type] || 0) + 1;
    });
    return stats;
  };

  if (importComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Import Complete
          </CardTitle>
          <CardDescription>
            Successfully imported {parsedData.length} pay codes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(getTypeStats()).map(([type, count]) => (
              <Badge key={type} variant="secondary">
                {type}: {count}
              </Badge>
            ))}
          </div>
          <Button onClick={reset}>Import Another File</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import ADP Payroll Items</CardTitle>
        <CardDescription>
          Upload your ADP "Payroll Items" Excel file to import pay codes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {!file && (
          <div className="space-y-4">
            <Label htmlFor="file-upload">Select Excel File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
            <div className="text-sm text-muted-foreground">
              <p>Expected format:</p>
              <ul className="list-disc list-inside ml-4">
                <li>Excel file with "Payroll Item", "Code", "Company Code(s)", "Description" columns</li>
                <li>Sections for "Earnings" and "Deductions"</li>
                <li>Standard ADP Payroll Items report format</li>
              </ul>
            </div>
          </div>
        )}

        {file && parsedData.length > 0 && !isImporting && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="font-medium">{file.name}</span>
              <Badge variant="secondary">{parsedData.length} codes found</Badge>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Type Distribution:</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(getTypeStats()).map(([type, count]) => (
                  <Badge key={type} variant="outline">
                    {type}: {count}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Sample Data (first 5 rows):</h4>
              <div className="max-h-40 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Code</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-left">Scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2 font-mono">{item.code}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            {item.payrollItem === 'Deductions' ? 'Deduction' : 
                             deriveType(item.code, item.description)}
                          </Badge>
                        </td>
                        <td className="p-2">{item.description}</td>
                        <td className="p-2 text-muted-foreground">{item.companyScope}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImport} className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import {parsedData.length} Pay Codes
              </Button>
              <Button variant="outline" onClick={reset}>
                Select Different File
              </Button>
            </div>
          </div>
        )}

        {isImporting && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span>Importing pay codes...</span>
            </div>
            <Progress value={importProgress} className="w-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}