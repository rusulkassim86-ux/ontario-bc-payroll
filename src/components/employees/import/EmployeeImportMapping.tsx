import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import type { ParsedFile } from "@/hooks/useFileParser";

interface EmployeeImportMappingProps {
  parsedFile: ParsedFile;
  onMappingComplete: (mapping: Record<string, string>) => void;
  onBack: () => void;
}

const EMPLOYEE_FIELDS = {
  employee_number: { label: 'Employee ID', required: true, type: 'text' },
  first_name: { label: 'First Name', required: true, type: 'text' },
  last_name: { label: 'Last Name', required: true, type: 'text' },
  email: { label: 'Email', required: true, type: 'email' },
  phone: { label: 'Phone', required: false, type: 'text' },
  department: { label: 'Department', required: false, type: 'text' },
  position: { label: 'Position', required: false, type: 'text' },
  classification: { label: 'Classification', required: false, type: 'text' },
  province_code: { label: 'Province', required: true, type: 'select', options: ['ON', 'BC'] },
  hire_date: { label: 'Hire Date', required: true, type: 'date' },
  sin: { label: 'SIN', required: false, type: 'text' },
  pay_rate: { label: 'Pay Rate', required: false, type: 'number' },
  gl_cost_center: { label: 'GL Code', required: false, type: 'text' },
  union_seniority: { label: 'Union Seniority Number', required: false, type: 'text' },
  reports_to: { label: 'Reports To', required: false, type: 'text' },
  fte_hours_per_week: { label: 'FTE Hours/Week', required: false, type: 'number' }
};

export function EmployeeImportMapping({ parsedFile, onMappingComplete, onBack }: EmployeeImportMappingProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    // Auto-detect mapping based on column headers
    const autoMapping: Record<string, string> = {};
    
    Object.keys(EMPLOYEE_FIELDS).forEach(field => {
      const fieldConfig = EMPLOYEE_FIELDS[field as keyof typeof EMPLOYEE_FIELDS];
      const matchingHeader = parsedFile.headers.find(header => {
        const headerLower = header.toLowerCase().trim();
        const fieldLower = fieldConfig.label.toLowerCase();
        
        return headerLower === fieldLower ||
               headerLower.includes(fieldLower) ||
               (field === 'employee_number' && (headerLower.includes('employee') && headerLower.includes('id'))) ||
               (field === 'province_code' && headerLower.includes('province')) ||
               (field === 'hire_date' && headerLower.includes('hire'));
      });
      
      if (matchingHeader) {
        autoMapping[field] = matchingHeader;
      }
    });
    
    return autoMapping;
  });

  const mappedFields = useMemo(() => {
    return Object.values(mapping).filter(Boolean);
  }, [mapping]);

  const requiredFields = useMemo(() => {
    return Object.entries(EMPLOYEE_FIELDS)
      .filter(([_, config]) => config.required)
      .map(([field, _]) => field);
  }, []);

  const missingRequiredFields = useMemo(() => {
    return requiredFields.filter(field => !mapping[field]);
  }, [requiredFields, mapping]);

  const duplicateColumns = useMemo(() => {
    const usedColumns = Object.values(mapping).filter(Boolean);
    const duplicates = usedColumns.filter((column, index) => usedColumns.indexOf(column) !== index);
    return [...new Set(duplicates)];
  }, [mapping]);

  const canProceed = missingRequiredFields.length === 0 && duplicateColumns.length === 0;

  const handleMappingChange = (field: string, column: string | null) => {
    setMapping(prev => ({
      ...prev,
      [field]: column || ''
    }));
  };

  const getSampleData = (column: string) => {
    const firstThreeRows = parsedFile.data.slice(0, 3);
    return firstThreeRows.map(row => row[column] || '').filter(Boolean);
  };

  return (
    <div className="space-y-6">
      {/* File Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{parsedFile.fileName}</h3>
              <p className="text-sm text-muted-foreground">
                {parsedFile.totalRows} rows • {parsedFile.headers.length} columns
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                {mappedFields.length} of {Object.keys(EMPLOYEE_FIELDS).length} mapped
              </Badge>
              <Badge variant={canProceed ? "default" : "secondary"}>
                {canProceed ? "Ready" : "Incomplete"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Alerts */}
      {missingRequiredFields.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Missing required fields: {missingRequiredFields.map(field => 
              EMPLOYEE_FIELDS[field as keyof typeof EMPLOYEE_FIELDS].label
            ).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {duplicateColumns.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Duplicate column mappings detected: {duplicateColumns.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {canProceed && (
        <Alert>
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>
            All required fields are mapped. Ready to proceed.
          </AlertDescription>
        </Alert>
      )}

      {/* Mapping Table */}
      <Card>
        <CardHeader>
          <CardTitle>Column Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Field</TableHead>
                <TableHead>Source Column</TableHead>
                <TableHead>Sample Data</TableHead>
                <TableHead>Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(EMPLOYEE_FIELDS).map(([field, config]) => (
                <TableRow key={field}>
                  <TableCell className="font-medium">{config.label}</TableCell>
                  <TableCell>
                    <Select 
                      value={mapping[field] || ''} 
                      onValueChange={(value) => handleMappingChange(field, value === 'none' ? null : value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {parsedFile.headers.map(header => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {mapping[field] && (
                      <div className="space-y-1">
                        {getSampleData(mapping[field]).slice(0, 2).map((sample, index) => (
                          <div key={index} className="text-xs bg-muted px-2 py-1 rounded">
                            {sample}
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {config.required ? (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Optional</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.entries(mapping).filter(([_, column]) => column).map(([field, column]) => (
                    <TableHead key={field} className="min-w-32">
                      <div>
                        <div className="font-medium">{EMPLOYEE_FIELDS[field as keyof typeof EMPLOYEE_FIELDS].label}</div>
                        <div className="text-xs text-muted-foreground">{column}</div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedFile.data.slice(0, 3).map((row, index) => (
                  <TableRow key={index}>
                    {Object.entries(mapping).filter(([_, column]) => column).map(([field, column]) => (
                      <TableCell key={field} className="text-sm">
                        {row[column!] || '—'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={() => onMappingComplete(mapping)}
          disabled={!canProceed}
        >
          Continue to Preview
        </Button>
      </div>
    </div>
  );
}