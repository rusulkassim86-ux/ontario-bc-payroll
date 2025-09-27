import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useFileParser, type ParsedFile } from "@/hooks/useFileParser";

interface EmployeeImportUploadProps {
  onFileProcessed: (file: ParsedFile, companyCode: string, isUnion: boolean) => void;
  onCancel: () => void;
}

export function EmployeeImportUpload({ onFileProcessed, onCancel }: EmployeeImportUploadProps) {
  const [companyCode, setCompanyCode] = useState<string>('72R');
  const [isUnion, setIsUnion] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { parseFile, loading } = useFileParser();

  const handleFileSelect = async (file: File) => {
    setError(null);
    
    // Validate file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx?|csv)$/i)) {
      setError('Please select a valid Excel (.xlsx, .xls) or CSV file');
      return;
    }

    // Validate file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      setError('File size must be less than 20MB');
      return;
    }

    try {
      const parsedFile = await parseFile(file);
      if (parsedFile) {
        onFileProcessed(parsedFile, companyCode, isUnion);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Company Code</label>
              <Select value={companyCode} onValueChange={setCompanyCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="72R">72R - General Construction</SelectItem>
                  <SelectItem value="72S">72S - Specialized Services</SelectItem>
                  <SelectItem value="OZC">OZC - Operations Zone C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox 
                id="union-flag" 
                checked={isUnion}
                onCheckedChange={(checked) => setIsUnion(checked as boolean)}
              />
              <label htmlFor="union-flag" className="text-sm font-medium">
                Union employees in this file
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardContent className="p-6">
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }
              ${loading ? 'pointer-events-none opacity-50' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
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
                <p className="text-sm text-muted-foreground mt-2">
                  Supports .xlsx, .xls, and .csv files up to 20MB
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

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Template Info */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">Expected File Format</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Your file should contain the following columns (column names can vary):
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>• Employee ID</div>
            <div>• First Name</div>
            <div>• Last Name</div>
            <div>• Email</div>
            <div>• Department</div>
            <div>• Position</div>
            <div>• Province (ON/BC)</div>
            <div>• Hire Date</div>
            <div>• Pay Rate</div>
            <div>• GL Code</div>
            <div>• SIN (optional)</div>
            <div>• Union Seniority (if union)</div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}