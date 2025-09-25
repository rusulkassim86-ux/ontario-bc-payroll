import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Clock, AlertTriangle, CheckCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CSVRow {
  device_serial: string;
  badge_id: string;
  employee_id?: string;
  punch_at: string;
  direction: 'IN' | 'OUT';
  method: string;
  rowIndex: number;
  issues: string[];
  isDuplicate: boolean;
}

interface ImportResult {
  imported: number;
  ignored: number;
  errors: number;
  details: {
    row: number;
    status: 'imported' | 'ignored' | 'error';
    reason?: string;
    data: CSVRow;
  }[];
}

export function PunchCSVImport() {
  const [open, setOpen] = useState(false);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [detectedTimezone, setDetectedTimezone] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredColumns = ['device_serial', 'badge_id', 'punch_at', 'direction', 'method'];
    
    // Validate required columns
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    const rows: CSVRow[] = [];
    const seenHashes = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        continue; // Skip malformed rows
      }

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      // Generate dedupe hash
      const dedupeHash = `${row.device_serial}|${row.badge_id}|${row.punch_at}|${row.direction}`;
      const isDuplicate = seenHashes.has(dedupeHash);
      seenHashes.add(dedupeHash);

      // Validate row
      const issues: string[] = [];
      if (!row.device_serial) issues.push('Missing device serial');
      if (!row.badge_id) issues.push('Missing badge ID');
      if (!row.punch_at) issues.push('Missing punch time');
      if (!['IN', 'OUT'].includes(row.direction?.toUpperCase())) {
        issues.push('Direction must be IN or OUT');
      }

      // Parse and validate timestamp
      let parsedTime;
      try {
        parsedTime = new Date(row.punch_at);
        if (isNaN(parsedTime.getTime())) {
          issues.push('Invalid timestamp format');
        }
      } catch {
        issues.push('Invalid timestamp format');
      }

      rows.push({
        device_serial: row.device_serial,
        badge_id: row.badge_id,
        employee_id: row.employee_id || undefined,
        punch_at: row.punch_at,
        direction: row.direction?.toUpperCase() as 'IN' | 'OUT',
        method: row.method || 'csv',
        rowIndex: i,
        issues,
        isDuplicate
      });
    }

    return rows;
  };

  const detectTimezone = (rows: CSVRow[]): string => {
    // Simple timezone detection based on timestamp format
    const sampleTime = rows[0]?.punch_at;
    if (!sampleTime) return 'UTC';
    
    if (sampleTime.includes('T') && sampleTime.includes('Z')) {
      return 'UTC';
    } else if (sampleTime.includes('T') && (sampleTime.includes('+') || sampleTime.includes('-'))) {
      return 'Timezone offset detected';
    } else {
      return 'Local time (no timezone info)';
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        setCsvData(parsed);
        setDetectedTimezone(detectTimezone(parsed));
        setImportResult(null);
      } catch (error) {
        toast({
          title: "Parse error",
          description: error instanceof Error ? error.message : "Failed to parse CSV",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (csvData.length === 0) return;

    setImporting(true);
    setProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke('punch-csv-import', {
        body: { 
          punches: csvData.filter(row => row.issues.length === 0 && !row.isDuplicate),
          timezone: detectedTimezone 
        }
      });

      if (error) throw error;

      setImportResult(data as ImportResult);
      setProgress(100);
      
      toast({
        title: "Import completed",
        description: `Imported ${data.imported} punches, ignored ${data.ignored}`,
      });

      // Clear the form
      setCsvData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadReport = () => {
    if (!importResult) return;

    const reportData = importResult.details.map(detail => ({
      row: detail.row,
      device_serial: detail.data.device_serial,
      badge_id: detail.data.badge_id,
      punch_at: detail.data.punch_at,
      direction: detail.data.direction,
      status: detail.status,
      reason: detail.reason || ''
    }));

    const csv = [
      'Row,Device Serial,Badge ID,Punch Time,Direction,Status,Reason',
      ...reportData.map(row => 
        `${row.row},"${row.device_serial}","${row.badge_id}","${row.punch_at}","${row.direction}","${row.status}","${row.reason}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `punch-import-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const validRows = csvData.filter(row => row.issues.length === 0 && !row.isDuplicate);
  const duplicateRows = csvData.filter(row => row.isDuplicate);
  const errorRows = csvData.filter(row => row.issues.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Punch CSV Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import Punch Data from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              disabled={importing}
            />
            <p className="text-sm text-muted-foreground">
              Required columns: device_serial, badge_id, punch_at, direction, method. Optional: employee_id
            </p>
          </div>

          {/* Preview */}
          {csvData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Preview</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Detected timezone: {detectedTimezone}
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{validRows.length}</div>
                  <div className="text-sm text-green-600">Valid</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{duplicateRows.length}</div>
                  <div className="text-sm text-yellow-600">Duplicates</div>
                </div>
                <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{errorRows.length}</div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{csvData.length}</div>
                  <div className="text-sm text-blue-600">Total</div>
                </div>
              </div>

              {/* Data Preview */}
              <Tabs defaultValue="valid">
                <TabsList>
                  <TabsTrigger value="valid">
                    Valid ({validRows.length})
                  </TabsTrigger>
                  <TabsTrigger value="duplicates">
                    Duplicates ({duplicateRows.length})
                  </TabsTrigger>
                  <TabsTrigger value="errors">
                    Errors ({errorRows.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="valid" className="mt-4">
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Device</TableHead>
                          <TableHead>Badge ID</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Direction</TableHead>
                          <TableHead>Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validRows.slice(0, 10).map((row) => (
                          <TableRow key={row.rowIndex}>
                            <TableCell>{row.rowIndex}</TableCell>
                            <TableCell className="font-mono text-sm">{row.device_serial}</TableCell>
                            <TableCell className="font-mono text-sm">{row.badge_id}</TableCell>
                            <TableCell className="text-sm">{row.punch_at}</TableCell>
                            <TableCell>
                              <Badge variant={row.direction === 'IN' ? 'default' : 'secondary'}>
                                {row.direction}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{row.method}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {validRows.length > 10 && (
                      <div className="p-2 text-center text-sm text-muted-foreground border-t">
                        ... and {validRows.length - 10} more valid rows
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="duplicates" className="mt-4">
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Device</TableHead>
                          <TableHead>Badge ID</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Direction</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {duplicateRows.map((row) => (
                          <TableRow key={row.rowIndex}>
                            <TableCell>{row.rowIndex}</TableCell>
                            <TableCell className="font-mono text-sm">{row.device_serial}</TableCell>
                            <TableCell className="font-mono text-sm">{row.badge_id}</TableCell>
                            <TableCell className="text-sm">{row.punch_at}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{row.direction}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="errors" className="mt-4">
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Issues</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {errorRows.map((row) => (
                          <TableRow key={row.rowIndex}>
                            <TableCell>{row.rowIndex}</TableCell>
                            <TableCell className="font-mono text-sm max-w-xs truncate">
                              {`${row.device_serial || '?'} | ${row.badge_id || '?'} | ${row.punch_at || '?'}`}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {row.issues.map((issue, i) => (
                                  <Badge key={i} variant="destructive" className="text-xs">
                                    {issue}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Import Button */}
              <div className="flex justify-between items-center">
                <Alert className="flex-1 mr-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {validRows.length} valid punches will be imported. Duplicates and errors will be ignored.
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={handleImport}
                  disabled={importing || validRows.length === 0}
                  className="min-w-32"
                >
                  {importing ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import {validRows.length} Punches
                    </>
                  )}
                </Button>
              </div>

              {/* Progress */}
              {importing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing punches...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Import Results
                </h3>
                <Button variant="outline" size="sm" onClick={downloadReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                  <div className="text-sm text-green-600">Imported</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{importResult.ignored}</div>
                  <div className="text-sm text-yellow-600">Ignored</div>
                </div>
                <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Import completed successfully. Affected employee timesheets have been recalculated.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}