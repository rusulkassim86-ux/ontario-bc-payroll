import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useFileParser } from "@/hooks/useFileParser";
import { EmployeeIdImportPreview } from "./import/EmployeeIdImportPreview";
import { useEmployeeIdImporter, EMPLOYEE_ID_FIELDS, autoDetectEmployeeIdMapping } from "@/hooks/useEmployeeIdImporter";
import type { ParsedFile } from "@/hooks/useFileParser";

interface EmployeeIdImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

export function EmployeeIdImporter({ open, onOpenChange }: EmployeeIdImporterProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    successful: number;
    failed: number;
    errors: Array<{ row: number; field: string; message: string; }>;
  } | null>(null);

  const { processImport, isImporting } = useEmployeeIdImporter();

  const { parseFile, loading } = useFileParser();

  const handleFileSelect = async (file: File) => {
    try {
      const parsedFile = await parseFile(file);
      if (parsedFile) {
        setParsedFile(parsedFile);
        const autoMapping = autoDetectEmployeeIdMapping(parsedFile.headers);
        setColumnMapping(autoMapping);
        setCurrentStep('mapping');
      }
    } catch (error) {
      console.error('Failed to parse file:', error);
    }
  };

  const handleMappingConfirm = (mapping: Record<string, string>) => {
    setColumnMapping(mapping);
    setCurrentStep('preview');
  };

  const handleImportStart = async () => {
    if (!parsedFile) return;

    setCurrentStep('importing');
    setImportProgress(0);

    const result = await processImport({
      data: parsedFile.data,
      mapping: columnMapping,
      onProgress: setImportProgress
    });

    setImportResult(result);
    setCurrentStep('complete');
  };

  const handleClose = () => {
    setCurrentStep('upload');
    setParsedFile(null);
    setColumnMapping({});
    setImportProgress(0);
    setImportResult(null);
    onOpenChange(false);
  };

  const exportErrorLog = () => {
    if (!importResult?.errors.length) return;

    const csvContent = [
      ['Row', 'Field', 'Message'],
      ...importResult.errors.map(error => [
        error.row.toString(),
        error.field,
        error.message
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee-import-errors.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Employee ID Import</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center space-x-4">
            {['upload', 'mapping', 'preview', 'importing', 'complete'].map((step, index) => (
              <div
                key={step}
                className={`flex items-center ${
                  index < ['upload', 'mapping', 'preview', 'importing', 'complete'].indexOf(currentStep)
                    ? 'text-primary'
                    : index === ['upload', 'mapping', 'preview', 'importing', 'complete'].indexOf(currentStep)
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                    index < ['upload', 'mapping', 'preview', 'importing', 'complete'].indexOf(currentStep)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : index === ['upload', 'mapping', 'preview', 'importing', 'complete'].indexOf(currentStep)
                      ? 'border-foreground'
                      : 'border-muted-foreground'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="ml-2 text-sm capitalize">{step}</span>
                {index < 4 && <div className="w-8 h-px bg-border ml-4" />}
              </div>
            ))}
          </div>

          {/* Step Content */}
          {currentStep === 'upload' && (
            <div className="space-y-4">
              <Alert>
                <FileSpreadsheet className="w-4 h-4" />
                <AlertDescription>
                  Upload an Excel or CSV file with Employee ID as the primary identifier and deduction codes for automatic union/group assignment.
                </AlertDescription>
              </Alert>
              
              {/* File Upload */}
              <Card>
                <CardContent className="p-6">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center transition-colors border-muted-foreground/25 hover:border-muted-foreground/50">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={loading}
                    />
                    
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <div className="p-3 bg-primary/10 rounded-full">
                          <FileSpreadsheet className="w-8 h-8 text-primary" />
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold mb-2">
                          {loading ? 'Processing...' : 'Upload Employee File'}
                        </h3>
                        <p className="text-muted-foreground">
                          Drag and drop your Excel or CSV file here, or click to browse
                        </p>
                      </div>
                      
                      <Button variant="outline" disabled={loading}>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 'mapping' && parsedFile && (
            <div className="space-y-6">
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
                        <TableHead>Required</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(EMPLOYEE_ID_FIELDS).map(([field, config]) => (
                        <TableRow key={field}>
                          <TableCell className="font-medium">{config.label}</TableCell>
                          <TableCell>
                            <Select 
                              value={columnMapping[field] || ''} 
                              onValueChange={(value) => setColumnMapping(prev => ({
                                ...prev,
                                [field]: value === 'none' ? '' : value
                              }))}
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

              {/* Actions */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep('upload')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={() => handleMappingConfirm(columnMapping)}
                  disabled={!columnMapping.employeeId}
                >
                  Continue to Preview
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'preview' && parsedFile && (
            <EmployeeIdImportPreview
              parsedFile={parsedFile}
              mapping={columnMapping}
              onImportStart={handleImportStart}
              onBack={() => setCurrentStep('mapping')}
            />
          )}

          {currentStep === 'importing' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Importing Employees</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={importProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    Processing employees... {Math.round(importProgress)}%
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 'complete' && importResult && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {importResult.failed === 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                    Import Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{importResult.successful}</p>
                      <p className="text-sm text-muted-foreground">Successful</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="space-y-4">
                      <Alert variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>
                          {importResult.errors.length} rows failed to import. Download the error log for details.
                        </AlertDescription>
                      </Alert>
                      <Button onClick={exportErrorLog} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download Error Log
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleClose} variant="outline">
                      Close
                    </Button>
                    <Button 
                      onClick={() => {
                        setCurrentStep('upload');
                        setParsedFile(null);
                        setColumnMapping({});
                        setImportResult(null);
                      }}
                    >
                      Import Another File
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}