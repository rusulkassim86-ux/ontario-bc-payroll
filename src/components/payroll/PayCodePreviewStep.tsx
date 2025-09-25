import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Play, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { ParsedFile, ColumnMapping, PAYCODE_FIELDS, ImportError } from '@/hooks/useFileParser';
import { usePayCodes } from '@/hooks/usePayCodes';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PayCodePreviewStepProps {
  parsedFile: ParsedFile;
  onComplete: () => void;
  onBack: () => void;
}

export function PayCodePreviewStep({ parsedFile, onComplete, onBack }: PayCodePreviewStepProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [processedRows, setProcessedRows] = useState(0);
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update'>('update');
  const { toast } = useToast();

  // Get the mapping from localStorage or generate it
  const mapping: ColumnMapping = useMemo(() => {
    // In a real implementation, this would come from the previous step
    // For now, we'll auto-detect it
    const autoMapping: ColumnMapping = {};
    Object.keys(PAYCODE_FIELDS).forEach(field => {
      const header = parsedFile.headers.find(h => 
        h.toLowerCase().replace(/[^a-z]/g, '') === field.toLowerCase().replace(/[^a-z]/g, '')
      );
      autoMapping[field] = header || null;
    });
    return autoMapping;
  }, [parsedFile.headers]);

  // Transform and validate data
  const transformedData = useMemo(() => {
    const results: Array<{
      row: number;
      data: any;
      errors: string[];
      warnings: string[];
    }> = [];

    parsedFile.data.forEach((row, index) => {
      const transformedRow: any = {};
      const errors: string[] = [];
      const warnings: string[] = [];

      // Map columns to fields
      Object.entries(mapping).forEach(([field, column]) => {
        if (column && row[column] !== undefined && row[column] !== '') {
          let value = row[column];

          // Transform based on field type
          const fieldConfig = PAYCODE_FIELDS[field];
          if (fieldConfig) {
            switch (fieldConfig.type) {
              case 'boolean':
                if (typeof value === 'string') {
                  const lowerValue = value.toLowerCase().trim();
                  transformedRow[field] = ['true', 'yes', '1', 'y', 'on'].includes(lowerValue);
                } else {
                  transformedRow[field] = Boolean(value);
                }
                break;
              
              case 'number':
                const numValue = typeof value === 'string' ? parseFloat(value) : value;
                if (isNaN(numValue)) {
                  errors.push(`Invalid number for ${fieldConfig.label}: ${value}`);
                } else {
                  transformedRow[field] = numValue;
                }
                break;
              
              case 'date':
                try {
                  const dateValue = new Date(value);
                  if (isNaN(dateValue.getTime())) {
                    errors.push(`Invalid date for ${fieldConfig.label}: ${value}`);
                  } else {
                    transformedRow[field] = dateValue.toISOString().split('T')[0];
                  }
                } catch {
                  errors.push(`Invalid date for ${fieldConfig.label}: ${value}`);
                }
                break;

              case 'select':
                if (fieldConfig.options && !fieldConfig.options.includes(value)) {
                  errors.push(`Invalid option for ${fieldConfig.label}: ${value}. Must be one of: ${fieldConfig.options.join(', ')}`);
                } else {
                  transformedRow[field] = value;
                }
                break;

              default:
                transformedRow[field] = String(value).trim();
            }
          }
        } else if (PAYCODE_FIELDS[field]?.required) {
          errors.push(`Missing required field: ${PAYCODE_FIELDS[field].label}`);
        }
      });

      // Set defaults
      if (!transformedRow.rate_type) transformedRow.rate_type = 'multiplier';
      if (!transformedRow.category) transformedRow.category = 'earning';
      if (transformedRow.taxable_federal === undefined) transformedRow.taxable_federal = true;
      if (transformedRow.taxable_cpp === undefined) transformedRow.taxable_cpp = true;
      if (transformedRow.taxable_ei === undefined) transformedRow.taxable_ei = true;
      if (transformedRow.requires_hours === undefined) transformedRow.requires_hours = true;
      if (transformedRow.requires_amount === undefined) transformedRow.requires_amount = false;
      if (transformedRow.active === undefined) transformedRow.active = true;
      if (transformedRow.stackable === undefined) transformedRow.stackable = false;

      // Build taxable_flags JSON
      transformedRow.taxable_flags = {
        federal: transformedRow.taxable_federal || false,
        cpp: transformedRow.taxable_cpp || false,
        ei: transformedRow.taxable_ei || false
      };

      results.push({
        row: index + 2, // +2 for header + 1-indexed
        data: transformedRow,
        errors,
        warnings
      });
    });

    return results;
  }, [parsedFile.data, mapping]);

  const validRows = transformedData.filter(item => item.errors.length === 0);
  const errorRows = transformedData.filter(item => item.errors.length > 0);
  const duplicateCodes = useMemo(() => {
    const codes = validRows.map(item => item.data.code);
    return codes.filter((code, index) => codes.indexOf(code) !== index);
  }, [validRows]);

  const previewData = transformedData.slice(0, 10);

  const handleImport = async () => {
    if (validRows.length === 0) {
      toast({
        title: "No Valid Data",
        description: "Please fix validation errors before importing",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setProcessedRows(0);
    setImportErrors([]);

    try {
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < validRows.length; i += batchSize) {
        batches.push(validRows.slice(i, i + batchSize));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        for (const item of batch) {
          try {
            const payCodeData = {
              ...item.data,
              company_id: '', // Will be set by RLS
            };

            if (duplicateHandling === 'update') {
              // Upsert by code
              const { error } = await supabase
                .from('pay_codes')
                .upsert(payCodeData, { 
                  onConflict: 'company_id,code',
                  ignoreDuplicates: false 
                });

              if (error) throw error;
            } else {
              // Insert only if not exists
              const { error } = await supabase
                .from('pay_codes')
                .insert(payCodeData);

              if (error && !error.message.includes('duplicate')) {
                throw error;
              }
            }

            setProcessedRows(prev => prev + 1);
          } catch (error) {
            console.error('Import error for row:', item.row, error);
            setImportErrors(prev => [...prev, {
              row: item.row,
              field: 'general',
              value: item.data.code,
              message: error instanceof Error ? error.message : 'Unknown error'
            }]);
          }
        }

        setImportProgress(((batchIndex + 1) / batches.length) * 100);
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${processedRows} pay codes`,
      });

      onComplete();

    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Preview & Validate
        </CardTitle>
        <CardDescription>
          Review the data before importing. Fix any validation errors.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{transformedData.length}</div>
            <div className="text-sm text-blue-800">Total Rows</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{validRows.length}</div>
            <div className="text-sm text-green-800">Valid Rows</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{errorRows.length}</div>
            <div className="text-sm text-red-800">Error Rows</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{duplicateCodes.length}</div>
            <div className="text-sm text-orange-800">Duplicate Codes</div>
          </div>
        </div>

        {/* Import Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Duplicate Handling</label>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="update"
                      checked={duplicateHandling === 'update'}
                      onCheckedChange={() => setDuplicateHandling('update')}
                    />
                    <label htmlFor="update" className="text-sm">Update existing pay codes</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="skip"
                      checked={duplicateHandling === 'skip'}
                      onCheckedChange={() => setDuplicateHandling('skip')}
                    />
                    <label htmlFor="skip" className="text-sm">Skip duplicates</label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validation Results */}
        {errorRows.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="font-medium text-red-800 mb-2">
                {errorRows.length} rows have validation errors and will be skipped:
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {errorRows.slice(0, 5).map(item => (
                  <div key={item.row} className="text-sm text-red-700">
                    Row {item.row}: {item.errors.join(', ')}
                  </div>
                ))}
                {errorRows.length > 5 && (
                  <div className="text-sm text-red-700">
                    ... and {errorRows.length - 5} more errors
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {duplicateCodes.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <Info className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <div className="font-medium text-orange-800 mb-1">
                Duplicate pay codes found: {duplicateCodes.join(', ')}
              </div>
              <div className="text-sm text-orange-700">
                Choose how to handle duplicates in the import options above.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Import Progress */}
        {isImporting && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importing pay codes...</span>
                  <span>{processedRows} / {validRows.length}</span>
                </div>
                <Progress value={importProgress} className="w-full" />
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview Table */}
        <div>
          <h3 className="font-medium mb-3">Data Preview (First 10 Rows)</h3>
          <div className="border rounded-lg overflow-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Rate Type</TableHead>
                  <TableHead>Multiplier</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((item) => (
                  <TableRow key={item.row} className={item.errors.length > 0 ? 'bg-red-50' : ''}>
                    <TableCell className="font-mono">{item.row}</TableCell>
                    <TableCell className="font-mono">{item.data.code}</TableCell>
                    <TableCell>{item.data.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.data.category}</Badge>
                    </TableCell>
                    <TableCell>{item.data.rate_type}</TableCell>
                    <TableCell>{item.data.multiplier || '-'}</TableCell>
                    <TableCell>
                      {item.errors.length > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {item.errors.length} error{item.errors.length > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Valid</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} disabled={isImporting}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Mapping
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={validRows.length === 0 || isImporting}
            className="bg-gradient-primary"
          >
            <Play className="h-4 w-4 mr-2" />
            {isImporting ? 'Importing...' : `Import ${validRows.length} Pay Codes`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}