import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Upload, FileText, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useADPImport, ADPFileType, ImportSummary } from '@/hooks/useADPImport';
import { useFileParser } from '@/hooks/useFileParser';

export function ADPImportWizard() {
  const [adpMode, setAdpMode] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [detectedType, setDetectedType] = useState<ADPFileType | null>(null);
  const [importComplete, setImportComplete] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const { parseFile } = useFileParser();
  const { processImport, detectFileType, importing } = useADPImport();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setImportComplete(false);
    setDetectedType(null);

    const parsed = await parseFile(selectedFile);
    if (!parsed) {
      setErrors(['Failed to parse file']);
      return;
    }

    setParsedData(parsed.data);
    setParsedHeaders(parsed.headers);

    if (adpMode) {
      const fileType = detectFileType(parsed.headers);
      setDetectedType(fileType);

      if (fileType.type === 'unknown') {
        setErrors(['Could not detect ADP file type. Please check headers.']);
      }
    }
  };

  const handleImport = async () => {
    if (!parsedData || !parsedHeaders) return;

    try {
      const result = await processImport(parsedData, parsedHeaders);
      setSummary(result.summary);
      setImportComplete(true);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Import failed']);
    }
  };

  const reset = () => {
    setFile(null);
    setParsedData(null);
    setParsedHeaders([]);
    setDetectedType(null);
    setImportComplete(false);
    setSummary(null);
    setErrors([]);
  };

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'payroll_items': return 'Payroll Items Report';
      case 'gl_report': return 'GL Report';
      case 'deduction_codes': return 'Deduction Codes List';
      default: return 'Unknown';
    }
  };

  if (importComplete && summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Import Complete
          </CardTitle>
          <CardDescription>
            {detectedType && `Successfully imported ${getFileTypeLabel(detectedType.type)}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summary.created}</div>
              <div className="text-sm text-muted-foreground">Created</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{summary.updated}</div>
              <div className="text-sm text-muted-foreground">Updated</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{summary.skipped}</div>
              <div className="text-sm text-muted-foreground">Skipped</div>
            </div>
          </div>

          {summary.warnings.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Warnings ({summary.warnings.length}):</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {summary.warnings.slice(0, 5).map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                  {summary.warnings.length > 5 && (
                    <li className="text-muted-foreground">... and {summary.warnings.length - 5} more</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={reset}>Import Another File</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>ADP Import</CardTitle>
            <CardDescription>
              Upload ADP files directly - we'll auto-detect and map headers
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="adp-mode">ADP Import Mode</Label>
            <Switch
              id="adp-mode"
              checked={adpMode}
              onCheckedChange={setAdpMode}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {adpMode && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">ADP Mode: Drop files as-is</p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                  <li>Payroll Items Report (Payroll Item, Code, Company Code(s), Description)</li>
                  <li>GL Report (Detail/Description, Detail/Account)</li>
                  <li>Deduction Codes List (Code, Description)</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Headers are case/spacing insensitive. We never rename your codes.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!file && (
          <div className="space-y-4">
            <Label htmlFor="file-upload">Select File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
          </div>
        )}

        {file && parsedData && !importing && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="font-medium">{file.name}</span>
              <Badge variant="secondary">{parsedData.length} rows</Badge>
              {detectedType && detectedType.type !== 'unknown' && (
                <Badge variant="outline">{getFileTypeLabel(detectedType.type)}</Badge>
              )}
            </div>

            {detectedType && detectedType.type !== 'unknown' && (
              <div className="space-y-2">
                <h4 className="font-medium">Detected Headers:</h4>
                <div className="flex flex-wrap gap-2">
                  {detectedType.detectedHeaders.slice(0, 8).map((header, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {header}
                    </Badge>
                  ))}
                  {detectedType.detectedHeaders.length > 8 && (
                    <Badge variant="secondary" className="text-xs">
                      +{detectedType.detectedHeaders.length - 8} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-medium">Sample Data (first 10 rows):</h4>
              <div className="max-h-60 overflow-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {parsedHeaders.slice(0, 6).map((header, idx) => (
                        <th key={idx} className="p-2 text-left text-xs font-medium">
                          {header}
                        </th>
                      ))}
                      {parsedHeaders.length > 6 && (
                        <th className="p-2 text-left text-xs font-medium">...</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-t hover:bg-muted/50">
                        {parsedHeaders.slice(0, 6).map((header, colIdx) => (
                          <td key={colIdx} className="p-2 text-xs">
                            {row[header]?.toString().substring(0, 30) || '-'}
                          </td>
                        ))}
                        {parsedHeaders.length > 6 && (
                          <td className="p-2 text-xs text-muted-foreground">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={detectedType?.type === 'unknown'}>
                <Upload className="h-4 w-4 mr-2" />
                Import {parsedData.length} Records
              </Button>
              <Button variant="outline" onClick={reset}>
                Select Different File
              </Button>
            </div>
          </div>
        )}

        {importing && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span>Importing and normalizing data...</span>
            </div>
            <Progress value={50} className="w-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
