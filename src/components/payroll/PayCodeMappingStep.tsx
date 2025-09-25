import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2, Settings } from 'lucide-react';
import { ParsedFile, ColumnMapping, autoDetectMapping, PAYCODE_FIELDS } from '@/hooks/useFileParser';

interface PayCodeMappingStepProps {
  parsedFile: ParsedFile;
  onComplete: () => void;
  onBack: () => void;
}

export function PayCodeMappingStep({ parsedFile, onComplete, onBack }: PayCodeMappingStepProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(() => 
    autoDetectMapping(parsedFile.headers)
  );

  const mappedFields = useMemo(() => {
    return Object.entries(mapping).filter(([_, column]) => column !== null);
  }, [mapping]);

  const requiredFields = useMemo(() => {
    return Object.entries(PAYCODE_FIELDS)
      .filter(([_, config]) => config.required)
      .map(([field]) => field);
  }, []);

  const missingRequiredFields = useMemo(() => {
    return requiredFields.filter(field => !mapping[field]);
  }, [requiredFields, mapping]);

  const duplicateColumns = useMemo(() => {
    const used = new Set<string>();
    const duplicates = new Set<string>();
    
    Object.values(mapping).forEach(column => {
      if (column && used.has(column)) {
        duplicates.add(column);
      } else if (column) {
        used.add(column);
      }
    });
    
    return Array.from(duplicates);
  }, [mapping]);

  const canProceed = missingRequiredFields.length === 0 && duplicateColumns.length === 0;

  const handleMappingChange = (field: string, column: string | null) => {
    setMapping(prev => ({ ...prev, [field]: column }));
  };

  const previewData = parsedFile.data.slice(0, 3);

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Map Columns
        </CardTitle>
        <CardDescription>
          Map your file columns to pay code fields. Auto-detection has been applied.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{parsedFile.headers.length}</div>
            <div className="text-sm text-blue-800">Columns Found</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{mappedFields.length}</div>
            <div className="text-sm text-green-800">Fields Mapped</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{parsedFile.totalRows}</div>
            <div className="text-sm text-orange-800">Data Rows</div>
          </div>
        </div>

        {/* Validation Alerts */}
        {missingRequiredFields.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="font-medium text-red-800 mb-1">Missing Required Fields:</div>
              <div className="flex flex-wrap gap-2">
                {missingRequiredFields.map(field => (
                  <Badge key={field} variant="destructive" className="text-xs">
                    {PAYCODE_FIELDS[field]?.label || field}
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {duplicateColumns.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <div className="font-medium text-orange-800 mb-1">Duplicate Column Mappings:</div>
              <div className="flex flex-wrap gap-2">
                {duplicateColumns.map(column => (
                  <Badge key={column} variant="secondary" className="text-xs bg-orange-100">
                    {column}
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {canProceed && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Column mapping is valid and ready for import.
            </AlertDescription>
          </Alert>
        )}

        {/* Column Mapping Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Pay Code Field</TableHead>
                <TableHead className="w-1/3">Source Column</TableHead>
                <TableHead className="w-1/3">Sample Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(PAYCODE_FIELDS).map(([field, config]) => {
                const mappedColumn = mapping[field];
                const sampleValue = mappedColumn && previewData.length > 0 
                  ? previewData[0][mappedColumn] 
                  : null;

                return (
                  <TableRow key={field}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{config.label}</span>
                        {config.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                        <Badge variant="outline" className="text-xs">
                          {config.type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mappedColumn || 'none'}
                        onValueChange={(value) => 
                          handleMappingChange(field, value === 'none' ? null : value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">-- No mapping --</span>
                          </SelectItem>
                          {parsedFile.headers.map(header => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {sampleValue ? (
                        <div className="font-mono text-sm bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                          {String(sampleValue)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No data</span>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              )}
            </TableBody>
          </Table>
        </div>

        {/* Preview Sample Data */}
        <div>
          <h3 className="font-medium mb-3">Sample Data Preview (First 3 Rows)</h3>
          <div className="border rounded-lg overflow-auto max-h-64">
            <Table>
              <TableHeader>
                <TableRow>
                  {parsedFile.headers.map(header => (
                    <TableHead key={header} className="min-w-[120px]">
                      <div className="space-y-1">
                        <div className="font-medium">{header}</div>
                        {Object.entries(mapping).find(([_, col]) => col === header) && (
                          <Badge variant="secondary" className="text-xs">
                            → {Object.entries(mapping).find(([_, col]) => col === header)?.[0]}
                          </Badge>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    {parsedFile.headers.map(header => (
                      <TableCell key={header} className="font-mono text-sm">
                        {String(row[header] || '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Upload
          </Button>
          <Button 
            onClick={onComplete} 
            disabled={!canProceed}
            className="bg-gradient-primary"
          >
            Continue to Preview
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}