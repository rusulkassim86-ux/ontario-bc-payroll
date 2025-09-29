import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, ArrowLeft, Upload } from "lucide-react";
import type { ParsedFile } from "@/hooks/useFileParser";
import { validateEmployeeIdData, findDuplicateEmployeeIds } from "@/utils/employeeIdValidation";
import { EMPLOYEE_ID_FIELDS, processDeductionCodes } from "@/hooks/useEmployeeIdImporter";

interface EmployeeIdImportPreviewProps {
  parsedFile: ParsedFile;
  mapping: Record<string, string>;
  onImportStart: () => void;
  onBack: () => void;
}

export function EmployeeIdImportPreview({ 
  parsedFile, 
  mapping, 
  onImportStart, 
  onBack 
}: EmployeeIdImportPreviewProps) {
  
  const { validationResults, transformedData } = useMemo(() => {
    const validation = validateEmployeeIdData(parsedFile.data, mapping);
    const duplicates = findDuplicateEmployeeIds(parsedFile.data, mapping);
    
    // Transform data for preview with deduction code processing
    const previewData = parsedFile.data.slice(0, 10).map((row, index) => {
      const transformedRow: Record<string, any> = { 
        _rowIndex: index + 2,
        _hasError: validation.errors.some(error => error.row === index + 2),
        _deductionProcessing: null
      };
      
      // Apply mappings
      Object.entries(mapping).forEach(([field, column]) => {
        if (column && row[column] !== undefined) {
          transformedRow[field] = row[column];
        }
      });

      // Process deduction codes to show resolved union/group
      const deductionCodesRaw = mapping.deductionCodes ? row[mapping.deductionCodes] : '';
      const unionOverride = mapping.unionOverride ? row[mapping.unionOverride] : undefined;
      const provinceOverride = mapping.provinceOverride ? row[mapping.provinceOverride] : undefined;
      const defaultProvince = mapping.province ? String(row[mapping.province]).trim().toUpperCase() : 'ON';

      if (deductionCodesRaw) {
        const deductionCodes = String(deductionCodesRaw)
          .split(/[,\s]+/)
          .map(code => code.trim())
          .filter(code => code.length > 0);

        const deductionResult = processDeductionCodes(
          deductionCodes,
          defaultProvince,
          unionOverride,
          provinceOverride
        );

        transformedRow._deductionProcessing = {
          raw: deductionCodesRaw,
          codes: deductionCodes,
          resolvedUnion: deductionResult.union,
          resolvedGroup: deductionResult.group,
          resolvedProvince: deductionResult.province,
          errors: deductionResult.errors
        };
      }
      
      return transformedRow;
    });
    
    return {
      validationResults: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        duplicateIds: duplicates.duplicateIds,
        totalRows: parsedFile.data.length,
        validRows: parsedFile.data.length - validation.errors.length,
        errorRows: validation.errors.length,
        warningRows: validation.warnings.length
      },
      transformedData: previewData
    };
  }, [parsedFile.data, mapping]);

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
            Showing raw deduction codes and resolved union + group values.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Province</TableHead>
                  <TableHead>Deduction Codes</TableHead>
                  <TableHead>Resolved Union</TableHead>
                  <TableHead>Resolved Group</TableHead>
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
                    <TableCell className="text-sm">
                      {row.employeeId || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.department || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <div>{row.province || '—'}</div>
                        {row._deductionProcessing?.resolvedProvince && 
                         row._deductionProcessing.resolvedProvince !== row.province && (
                          <div className="text-xs text-green-600">
                            → {row._deductionProcessing.resolvedProvince}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Raw: {row._deductionProcessing?.raw || '—'}
                        </div>
                        {row._deductionProcessing?.codes && (
                          <div className="flex gap-1 mt-1">
                            {row._deductionProcessing.codes.map((code: string) => (
                              <Badge key={code} variant="outline" className="text-xs">
                                {code}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {row._deductionProcessing?.resolvedUnion ? (
                        <Badge variant="secondary" className="text-xs">
                          {row._deductionProcessing.resolvedUnion}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row._deductionProcessing?.resolvedGroup ? (
                        <Badge variant="secondary" className="text-xs">
                          {row._deductionProcessing.resolvedGroup}
                        </Badge>
                      ) : '—'}
                    </TableCell>
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

      {/* Deduction Code Rules Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Deduction Code Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">72S</Badge>
              <span>→ union = UNIFOR</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">OZC</Badge>
              <span>→ group = Kitsault, province = BC</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">72R</Badge>
              <span>→ requires unionOverride (PSAC/NonUnion) and optional provinceOverride (BC)</span>
            </div>
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
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Import {validationResults.validRows} Employees
        </Button>
      </div>
    </div>
  );
}