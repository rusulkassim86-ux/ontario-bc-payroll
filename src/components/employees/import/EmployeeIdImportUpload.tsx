import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertCircle, FileText } from 'lucide-react';
import { useFileParser } from '@/hooks/useFileParser';
import { cn } from '@/lib/utils';

interface EmployeeIdImportUploadProps {
  onFileProcessed: (data: any[], headers: string[]) => void;
  onError: (error: string) => void;
  className?: string;
}

export function EmployeeIdImportUpload({
  onFileProcessed,
  onError,
  className
}: EmployeeIdImportUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { parseFile } = useFileParser();

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ];

    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
      onError('Please upload a valid Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await parseFile(file);
      
      if (!result.data || result.data.length === 0) {
        onError('The file appears to be empty or contains no valid data.');
        return;
      }

      if (!result.headers || result.headers.length === 0) {
        onError('Unable to detect column headers in the file.');
        return;
      }

      // Check for Employee ID column
      const hasEmployeeId = result.headers.some(header => 
        header.toLowerCase().includes('employee') && header.toLowerCase().includes('id')
      );

      if (!hasEmployeeId) {
        console.warn('No Employee ID column detected, but proceeding with import.');
      }

      onFileProcessed(result.data, result.headers);
    } catch (error) {
      console.error('File parsing error:', error);
      onError(error instanceof Error ? error.message : 'Failed to process the file. Please check the file format and try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [parseFile, onFileProcessed, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Employee Data File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Upload an Excel or CSV file with employee data. The file should contain an <strong>Employee ID</strong> column 
            as the primary identifier along with other employee information like names, job details, and deduction codes.
          </AlertDescription>
        </Alert>

        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isDragOver 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50",
            isProcessing && "opacity-50 pointer-events-none"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isProcessing ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Processing file...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
              </div>
              
              <div>
                <p className="text-lg font-medium">Drop your file here</p>
                <p className="text-muted-foreground">or click to browse</p>
              </div>
              
              <div className="flex justify-center">
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="file-upload"
                />
                <Label htmlFor="file-upload" asChild>
                  <Button variant="outline" className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </Label>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Supports Excel (.xlsx, .xls) and CSV files
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium">Required Columns:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Employee ID (unique identifier)</li>
              <li>• First Name</li>
              <li>• Last Name</li>
              <li>• Province</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Optional Columns:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Job Title, Department</li>
              <li>• Hire Date, Pay Type</li>
              <li>• Salary, Hourly Rate</li>
              <li>• Deduction Codes</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}