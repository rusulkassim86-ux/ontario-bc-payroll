import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, ArrowLeft, Upload } from "lucide-react";
import type { ParsedFile } from "@/hooks/useFileParser";
import { validateEmployeeData, findDuplicateEmployees } from "@/utils/adpValidation";

interface EmployeeImportPreviewProps {
  parsedFile: ParsedFile;
  mapping: Record<string, string>;
  companyCode: string;
  isUnion: boolean;
  onImportStart: () => void;
  onBack: () => void;
}

interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
}

export function EmployeeImportPreview({ 
  parsedFile, 
  mapping, 
  companyCode, 
  isUnion, 
  onImportStart, 
  onBack 
}: EmployeeImportPreviewProps) {
  
  const { validationResults, transformedData } = useMemo(() => {
    const validation = validateEmployeeData(parsedFile.data, mapping);
    const duplicates = findDuplicateEmployees(parsedFile.data, mapping);
    
    return {
      validationResults: {
        ...validation,
        duplicateIds: duplicates.duplicateIds,
        duplicateEmails: duplicates.duplicateEmails,
        totalRows: parsedFile.data.length,
        validRows: parsedFile.data.length - validation.errors.length,
        errorRows: validation.errors.length,
        warningRows: validation.warnings.length
      },
      transformedData: parsedFile.data.slice(0, 10) // Preview first 10 rows
    };
  }, [parsedFile.data, mapping]);
                if (!dateRegex.test(value) && !Date.parse(value)) {
                  errors.push({ row: rowNumber, field, value, message: 'Invalid date format (use YYYY-MM-DD)' });
                } else {
                  value = new Date(value).toISOString().split('T')[0];
                }
              } else {
                errors.push({ row: rowNumber, field, value, message: 'Hire date is required' });
              }
              break;
              
            case 'sin':
              if (value) {
                const sinStr = String(value).replace(/\D/g, '');
                if (sinStr.length !== 9) {
                  warnings.push({ row: rowNumber, field, value, message: 'SIN should be 9 digits' });
                }
                value = sinStr;
              }
              break;
              
            case 'pay_rate':
              if (value) {
                const numValue = parseFloat(value);
                if (isNaN(numValue) || numValue < 0) {
                  errors.push({ row: rowNumber, field, value, message: 'Invalid pay rate' });
                } else {
                  value = numValue;
                }
              }
              break;
              
            case 'fte_hours_per_week':
              if (value) {
                const numValue = parseFloat(value);
                if (isNaN(numValue) || numValue < 0 || numValue > 80) {
                  errors.push({ row: rowNumber, field, value, message: 'FTE hours must be between 0-80' });
                } else {
                  value = numValue;
                }
              } else {
                value = 40; // Default
              }
              break;
              
            case 'union_seniority':
              if (isUnion && !value) {
                warnings.push({ row: rowNumber, field, value, message: 'Union seniority recommended for union employees' });
              }
              break;
          }
          
          transformedRow[field] = value;
        }
      });
      
      // Set defaults
      transformedRow.company_code = companyCode;
      transformedRow.status = 'active';
      transformedRow.overtime_eligible = true;
      transformedRow.ot_multiplier = 1.5;
      
      return transformedRow;
    });
    
    const validRows = transformed.filter((_, index) => 
      !errors.some(error => error.row === index + 2)
    );
    
    const errorRows = transformed.filter((_, index) => 
      errors.some(error => error.row === index + 2)
    );
    
    return {
      validationResults: {
        errors,
        warnings,
        validRows: validRows.length,
        errorRows: errorRows.length,
        totalRows: transformed.length,
        duplicateEmployeeIds: Array.from(duplicateEmployeeIds),
        duplicateEmails: Array.from(duplicateEmails)
      },
      transformedData: transformed
    };
  }, [parsedFile.data, mapping, companyCode, isUnion]);

  const canProceed = validationResults.errors.length === 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{validationResults.totalRows}</p>
            <p className="text-sm text-muted-foreground">Total Rows</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{validationResults.validRows}</p>
            <p className="text-sm text-muted-foreground">Valid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{validationResults.errorRows}</p>
            <p className="text-sm text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{validationResults.warnings.length}</p>
            <p className="text-sm text-muted-foreground">Warnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Import Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Company Code: {companyCode} • {isUnion ? 'Union' : 'Non-Union'} employees
              </p>
            </div>
            <Badge variant={canProceed ? "default" : "destructive"}>
              {canProceed ? "Ready to Import" : "Has Errors"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationResults.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Found {validationResults.errors.length} validation errors that must be fixed before import.
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Warnings */}
      {validationResults.warnings.length > 0 && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Found {validationResults.warnings.length} warnings. Import can proceed but please review.
          </AlertDescription>
        </Alert>
      )}

      {/* Duplicate Employee IDs */}
      {validationResults.duplicateEmployeeIds.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Duplicate Employee IDs found: {validationResults.duplicateEmployeeIds.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {canProceed && (
        <Alert>
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>
            All validations passed. Ready to import {validationResults.validRows} employees.
          </AlertDescription>
        </Alert>
      )}

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Preview (First 10 Rows)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Province</TableHead>
                  <TableHead>Hire Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transformedData.slice(0, 10).map((row, index) => {
                  const hasError = validationResults.errors.some(error => error.row === row._rowIndex);
                  return (
                    <TableRow key={index} className={hasError ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {row._rowIndex}
                          {hasError && <AlertCircle className="w-4 h-4 text-destructive" />}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{row.employee_number || '—'}</TableCell>
                      <TableCell>{`${row.first_name || ''} ${row.last_name || ''}`.trim() || '—'}</TableCell>
                      <TableCell>{row.email || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.province_code || '—'}</Badge>
                      </TableCell>
                      <TableCell>{row.hire_date || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={hasError ? "destructive" : "default"}>
                          {hasError ? "Error" : "Valid"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Mapping
        </Button>
        <Button 
          onClick={onImportStart}
          disabled={!canProceed}
          className="bg-gradient-primary"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import {validationResults.validRows} Employees
        </Button>
      </div>
    </div>
  );
}