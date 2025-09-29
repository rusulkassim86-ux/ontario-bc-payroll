import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, ArrowLeft, Upload } from "lucide-react";
import type { ParsedFile } from "@/hooks/useFileParser";
import { validateEmployeeData, findDuplicateEmployees } from "@/utils/adpValidation";
import { EMPLOYEE_FIELDS } from "@/hooks/useFileParser";

interface EmployeeImportPreviewProps {
  parsedFile: ParsedFile;
  mapping: Record<string, string>;
  companyCode: string;
  isUnion: boolean;
  onImportStart: () => void;
  onBack: () => void;
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
    
    // Transform data for preview
    const previewData = parsedFile.data.slice(0, 10).map((row, index) => {
      const transformedRow: Record<string, any> = { 
        _rowIndex: index + 2,
        _hasError: validation.errors.some(error => error.row === index + 2)
      };
      
      // Apply mappings
      Object.entries(mapping).forEach(([field, column]) => {
        if (column && row[column] !== undefined) {
          let value = row[column];
          
          // Basic transformations for display
          switch (field) {
            case 'full_name':
              // Split full name for display
              if (value && !mapping.first_name && !mapping.last_name) {
                const parts = String(value).trim().split(/\s+/);
                transformedRow.first_name = parts[0] || '';
                transformedRow.last_name = parts.slice(1).join(' ') || '';
              }
              break;
            case 'province_code':
              transformedRow[field] = String(value).trim().toUpperCase();
              break;
            case 'hire_date':
            case 'birth_date':
              if (value) {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  transformedRow[field] = date.toISOString().split('T')[0];
                }
              }
              break;
            case 'sin':
              if (value) {
                transformedRow[field] = String(value).replace(/\D/g, '');
              }
              break;
            case 'rate':
              if (value) {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  transformedRow[field] = numValue;
                }
              }
              break;
            case 'postal_code':
              if (value) {
                transformedRow[field] = String(value).replace(/\s+/g, '').toUpperCase();
              }
              break;
            default:
              transformedRow[field] = value;
              break;
          }
        }
      });
      
      return transformedRow;
    });
    
    return {
      validationResults: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        duplicateIds: duplicates.duplicateIds,
        duplicateEmails: duplicates.duplicateEmails,
        totalRows: parsedFile.data.length,
        validRows: parsedFile.data.length - validation.errors.length,
        errorRows: validation.errors.length,
        warningRows: validation.warnings.length
      },
      transformedData: previewData
    };
  }, [parsedFile.data, mapping, companyCode, isUnion]);

  const canProceed = validationResults.isValid;

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
            <p className="text-sm text-muted-foreground">Valid Rows</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{validationResults.errorRows}</p>
            <p className="text-sm text-muted-foreground">Error Rows</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{validationResults.warningRows}</p>
            <p className="text-sm text-muted-foreground">Warning Rows</p>
          </CardContent>
        </Card>
      </div>

      {/* Import Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Import Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Company Code:</span> {companyCode}
            </div>
            <div>
              <span className="font-medium">Union Employees:</span> {isUnion ? 'Yes' : 'No'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Alerts */}
      {validationResults.errorRows > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            {validationResults.errorRows} rows have validation errors and will be skipped during import.
          </AlertDescription>
        </Alert>
      )}

      {validationResults.warningRows > 0 && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            {validationResults.warningRows} rows have warnings but will be imported.
          </AlertDescription>
        </Alert>
      )}

      {validationResults.duplicateIds.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Duplicate Employee IDs found: {validationResults.duplicateIds.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {validationResults.duplicateEmails.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Duplicate email addresses found: {validationResults.duplicateEmails.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {canProceed && (
        <Alert>
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>
            All validation checks passed. Ready to import {validationResults.validRows} employees.
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
                  <TableHead className="w-12">#</TableHead>
                  {Object.entries(mapping)
                    .filter(([_, column]) => column)
                    .slice(0, 8) // Show first 8 mapped fields
                    .map(([field, column]) => (
                      <TableHead key={field} className="min-w-32">
                        <div>
                          <div className="font-medium">
                            {EMPLOYEE_FIELDS[field as keyof typeof EMPLOYEE_FIELDS]?.label || field}
                          </div>
                          <div className="text-xs text-muted-foreground">{column}</div>
                        </div>
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transformedData.map((row, index) => (
                  <TableRow 
                    key={index} 
                    className={row._hasError ? "bg-destructive/10" : ""}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {row._rowIndex}
                        {row._hasError && (
                          <Badge variant="destructive" className="text-xs">Error</Badge>
                        )}
                      </div>
                    </TableCell>
                    {Object.entries(mapping)
                      .filter(([_, column]) => column)
                      .slice(0, 8)
                      .map(([field, _]) => (
                        <TableCell key={field} className="text-sm">
                          {row[field] !== undefined ? String(row[field]) : '—'}
                        </TableCell>
                      ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Error Details */}
      {validationResults.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Validation Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {validationResults.errors.slice(0, 20).map((error, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Badge variant="destructive" className="text-xs">Row {error.row}</Badge>
                  <span className="font-medium">{error.field}:</span>
                  <span>{error.message}</span>
                </div>
              ))}
              {validationResults.errors.length > 20 && (
                <div className="text-sm text-muted-foreground">
                  ... and {validationResults.errors.length - 20} more errors
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Mapping
        </Button>
        <Button 
          onClick={onImportStart} 
          disabled={!canProceed}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Import {validationResults.validRows} Employees
        </Button>
      </div>
    </div>
  );
}