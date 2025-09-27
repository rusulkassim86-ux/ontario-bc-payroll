import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download } from "lucide-react";
import { EmployeeImportUpload } from "./import/EmployeeImportUpload";
import { EmployeeImportMapping } from "./import/EmployeeImportMapping";
import { EmployeeImportPreview } from "./import/EmployeeImportPreview";
import { useEmployeeBulkImport } from "@/hooks/useEmployeeBulkImport";
import type { ParsedFile } from "@/hooks/useFileParser";

interface BulkEmployeeImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

export function BulkEmployeeImport({ open, onOpenChange }: BulkEmployeeImportProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [companyCode, setCompanyCode] = useState<string>('72R');
  const [isUnion, setIsUnion] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    successful: number;
    failed: number;
    errors: Array<{ row: number; field: string; message: string; }>;
  } | null>(null);

  const { processImport } = useEmployeeBulkImport();

  const handleFileUpload = (file: ParsedFile, companyCode: string, unionFlag: boolean) => {
    setParsedFile(file);
    setCompanyCode(companyCode);
    setIsUnion(unionFlag);
    setCurrentStep('mapping');
  };

  const handleMappingComplete = (mapping: Record<string, string>) => {
    setColumnMapping(mapping);
    setCurrentStep('preview');
  };

  const handleImportStart = async () => {
    if (!parsedFile) return;
    
    setCurrentStep('importing');
    setImportProgress(0);

    try {
      const result = await processImport({
        data: parsedFile.data,
        mapping: columnMapping,
        companyCode,
        isUnion,
        onProgress: setImportProgress
      });

      setImportResult(result);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        successful: 0,
        failed: parsedFile.data.length,
        errors: [{ row: 0, field: 'general', message: 'Import failed due to system error' }]
      });
      setCurrentStep('complete');
    }
  };

  const resetImporter = () => {
    setCurrentStep('upload');
    setParsedFile(null);
    setColumnMapping({});
    setImportProgress(0);
    setImportResult(null);
  };

  const getStepNumber = (step: ImportStep): number => {
    const steps = { upload: 1, mapping: 2, preview: 3, importing: 4, complete: 4 };
    return steps[step];
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <EmployeeImportUpload 
            onFileProcessed={handleFileUpload}
            onCancel={() => onOpenChange(false)}
          />
        );
      
      case 'mapping':
        return parsedFile ? (
          <EmployeeImportMapping
            parsedFile={parsedFile}
            onMappingComplete={handleMappingComplete}
            onBack={() => setCurrentStep('upload')}
          />
        ) : null;
      
      case 'preview':
        return parsedFile ? (
          <EmployeeImportPreview
            parsedFile={parsedFile}
            mapping={columnMapping}
            companyCode={companyCode}
            isUnion={isUnion}
            onImportStart={handleImportStart}
            onBack={() => setCurrentStep('mapping')}
          />
        ) : null;
      
      case 'importing':
        return (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Upload className="w-8 h-8 text-primary animate-pulse" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Importing Employees</h3>
              <p className="text-muted-foreground mb-6">
                Processing {parsedFile?.totalRows} employee records...
              </p>
              <div className="space-y-2">
                <Progress value={importProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  {Math.round(importProgress)}% complete
                </p>
              </div>
            </div>
          </div>
        );
      
      case 'complete':
        return (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-success/10 rounded-full">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Import Complete</h3>
              
              {importResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-success">{importResult.successful}</p>
                        <p className="text-sm text-muted-foreground">Successful</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-destructive">{importResult.failed}</p>
                        <p className="text-sm text-muted-foreground">Failed</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <Alert>
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>
                          {importResult.errors.length} errors occurred during import.
                        </AlertDescription>
                      </Alert>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download Error Log
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex gap-2 justify-center">
                    <Button onClick={resetImporter} variant="outline">
                      Import More
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Employee Import
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between py-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${getStepNumber(currentStep) >= step 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
                }
              `}>
                {step}
              </div>
              {step < 4 && (
                <div className={`
                  w-16 h-0.5 mx-2
                  ${getStepNumber(currentStep) > step ? 'bg-primary' : 'bg-muted'}
                `} />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between text-xs text-muted-foreground mb-6">
          <span>Upload File</span>
          <span>Map Columns</span>
          <span>Preview & Validate</span>
          <span>Complete</span>
        </div>

        {/* Step Content */}
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
}