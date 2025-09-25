import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useFileParser, ParsedFile } from '@/hooks/useFileParser';
import { PayCodeMappingStep } from './PayCodeMappingStep';
import { PayCodePreviewStep } from './PayCodePreviewStep';

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

export function PayCodeImporter() {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { parseFile, uploadFile, loading } = useFileParser();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileExtension)) {
      setImportErrors(['Please upload a CSV or Excel file (.csv, .xlsx, .xls)']);
      return;
    }

    // Validate file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      setImportErrors(['File size must be less than 20MB']);
      return;
    }

    setImportErrors([]);
    setUploadProgress(10);

    try {
      // Parse the file
      const parsed = await parseFile(file);
      setUploadProgress(50);
      
      if (!parsed) {
        setImportErrors(['Failed to parse file. Please check the file format.']);
        return;
      }

      if (parsed.data.length === 0) {
        setImportErrors(['No data rows found in the file.']);
        return;
      }

      setParsedFile(parsed);
      setUploadProgress(100);
      
      // Move to mapping step after a brief delay
      setTimeout(() => {
        setCurrentStep('mapping');
        setUploadProgress(0);
      }, 500);

    } catch (error) {
      console.error('Upload error:', error);
      setImportErrors([error instanceof Error ? error.message : 'Unknown error occurred']);
    }
  };

  const handleMappingComplete = () => {
    setCurrentStep('preview');
  };

  const handleImportComplete = () => {
    setCurrentStep('complete');
  };

  const resetImporter = () => {
    setCurrentStep('upload');
    setParsedFile(null);
    setUploadProgress(0);
    setImportErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Upload Pay Codes File
              </CardTitle>
              <CardDescription>
                Upload a CSV or Excel file containing your pay codes data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Choose a file to upload</h3>
                  <p className="text-muted-foreground mb-4">
                    Supports CSV, XLS, and XLSX files up to 20MB
                  </p>
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="bg-gradient-primary"
                  >
                    {loading ? 'Processing...' : 'Select File'}
                  </Button>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {importErrors.length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {importErrors.map((error, index) => (
                        <div key={index} className="text-red-800">• {error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Expected Columns</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div>• code (required)</div>
                  <div>• name (required)</div>
                  <div>• category</div>
                  <div>• description</div>
                  <div>• rate_type</div>
                  <div>• multiplier</div>
                  <div>• taxable_federal</div>
                  <div>• taxable_cpp</div>
                  <div>• taxable_ei</div>
                  <div>• requires_hours</div>
                  <div>• requires_amount</div>
                  <div>• gl_earnings_code</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'mapping':
        return parsedFile ? (
          <PayCodeMappingStep
            parsedFile={parsedFile}
            onComplete={handleMappingComplete}
            onBack={() => setCurrentStep('upload')}
          />
        ) : null;

      case 'preview':
        return parsedFile ? (
          <PayCodePreviewStep
            parsedFile={parsedFile}
            onComplete={handleImportComplete}
            onBack={() => setCurrentStep('mapping')}
          />
        ) : null;

      case 'complete':
        return (
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Import Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Your pay codes have been successfully imported.
              </p>
              <div className="flex gap-2">
                <Button onClick={resetImporter} variant="outline">
                  Import Another File
                </Button>
                <Button onClick={() => window.location.reload()}>
                  View Pay Codes
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Pay Code Importer</h1>
          {currentStep !== 'upload' && currentStep !== 'complete' && (
            <Button 
              variant="ghost" 
              onClick={resetImporter}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel Import
            </Button>
          )}
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center space-x-4 mb-6">
          {[
            { step: 'upload', label: 'Upload' },
            { step: 'mapping', label: 'Map Columns' },
            { step: 'preview', label: 'Preview & Validate' },
            { step: 'complete', label: 'Complete' }
          ].map((item, index) => (
            <div key={item.step} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep === item.step 
                  ? 'bg-primary text-primary-foreground' 
                  : index < ['upload', 'mapping', 'preview', 'complete'].indexOf(currentStep)
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }
              `}>
                {index < ['upload', 'mapping', 'preview', 'complete'].indexOf(currentStep) ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span className={`ml-2 text-sm ${
                currentStep === item.step ? 'font-medium' : 'text-muted-foreground'
              }`}>
                {item.label}
              </span>
              {index < 3 && (
                <div className={`mx-4 h-px w-8 ${
                  index < ['upload', 'mapping', 'preview', 'complete'].indexOf(currentStep) 
                    ? 'bg-green-500' 
                    : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        {renderStepContent()}
      </div>
    </div>
  );
}