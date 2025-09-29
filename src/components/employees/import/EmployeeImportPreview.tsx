import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, ArrowLeft, Upload } from "lucide-react";
import type { ParsedFile } from "@/hooks/useFileParser";
import { validateEmployeeData, findDuplicateEmployees, normalizeDate, normalizeProvince, normalizeName } from "@/utils/adpValidation";
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
    
    // Transform data for preview with normalization
    const previewData = parsedFile.data.slice(0, 10).map((row, index) => {
      const transformedRow: Record<string, any> = { 
        _rowIndex: index + 2,
        _hasError: validation.errors.some(error => error.row === index + 2),
        _normalizations: {} // Store normalization results for display
      };
      
      // Apply mappings with normalization
      Object.entries(mapping).forEach(([field, column]) => {
        if (column && row[column] !== undefined) {
          let value = row[column];
          
          // Apply normalization based on field type
          switch (field) {
            case 'full_name':
              if (value && !mapping.first_name && !mapping.last_name) {
                const nameResult = normalizeName(value);
                transformedRow.first_name = nameResult.firstName;
                transformedRow.last_name = nameResult.lastName;
                if (nameResult.hasChanged) {
                  transformedRow._normalizations.full_name = {
                    raw: nameResult.raw,
                    normalized: nameResult.normalized
                  };
                }
              }
              break;
            case 'province_code':
              if (value) {
                const provinceResult = normalizeProvince(value);
                transformedRow[field] = provinceResult.normalized || String(value).trim().toUpperCase();
                if (provinceResult.hasChanged) {
                  transformedRow._normalizations[field] = {
                    raw: provinceResult.raw,
                    normalized: provinceResult.normalized
                  };
                }
              }
              break;
            case 'hire_date':
            case 'birth_date':
              if (value) {
                const dateResult = normalizeDate(value);
                if (dateResult.normalized) {
                  transformedRow[field] = dateResult.normalized;
                  if (dateResult.hasChanged) {
                    transformedRow._normalizations[field] = {
                      raw: dateResult.raw,
                      normalized: dateResult.normalized
                    };
                  }
                }
              }
              break;
            case 'sin':
              if (value) {
                const raw = String(value);
                const normalized = raw.replace(/\D/g, '');
                transformedRow[field] = normalized;
                if (raw !== normalized) {
                  transformedRow._normalizations[field] = {
                    raw,
                    normalized
                  };
                }
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
                const raw = String(value);
                const normalized = raw.replace(/\s+/g, '').toUpperCase();
                transformedRow[field] = normalized;
                if (raw !== normalized) {
                  transformedRow._normalizations[field] = {
                    raw,
                    normalized
                  };
                }
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
          <p className="text-sm text-muted-foreground">
            Showing normalized values. Raw → Normalized changes are displayed below each field.
          </p>
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
                          <div>
                            <div>{row[field] !== undefined ? String(row[field]) : '—'}</div>
                            {row._normalizations[field] && (
                              <div className="text-xs text-muted-foreground mt-1">
                                <div className="text-amber-600">Raw: {row._normalizations[field].raw}</div>
                                <div className="text-green-600">→ {row._normalizations[field].normalized}</div>
                              </div>
                            )}
                          </div>
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