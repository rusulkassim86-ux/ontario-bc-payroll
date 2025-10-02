import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface ImportSummary {
  total: number;
  skipped: number;
  counts: Record<string, number>;
  expandedData: any[];
}

export function PayCycleImporter() {
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setSummary(null);

    try {
      // Parse Excel/CSV file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet);

      console.log(`Parsed ${rows.length} rows from ${file.name}`);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('import-pay-cycles', {
        body: { data: rows },
      });

      if (error) throw error;

      setSummary(data);
      toast({
        title: "Import Successful",
        description: `Imported ${data.total} pay cycle records (skipped ${data.skipped})`,
      });
    } catch (error: any) {
      console.error('Import failed:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import pay cycles",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Reset input
      event.target.value = '';
    }
  };

  const downloadExpandedCSV = () => {
    if (!summary?.expandedData) return;

    // Convert to CSV
    const worksheet = XLSX.utils.json_to_sheet(summary.expandedData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pay-cycles-expanded-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: "Expanded CSV file is downloading",
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Import Pay Cycles</h3>
          </div>

          <p className="text-sm text-muted-foreground">
            Upload an Excel/CSV file with columns: company_code, wk#, in_date, out_date, 
            pay_date, period_end, deduction_groups, special_effects, report_groups.
            <br />
            Use "ALL" for company_code to create entries for OZC, 72R, and 72S.
          </p>

          <div className="flex gap-4">
            <Button
              onClick={() => document.getElementById('pay-cycle-file-input')?.click()}
              disabled={isImporting}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {isImporting ? 'Importing...' : 'Upload File'}
            </Button>

            <input
              id="pay-cycle-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </Card>

      {summary && (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Import Summary</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Imported</p>
                <p className="text-2xl font-bold text-primary">{summary.total}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Skipped</p>
                <p className="text-2xl font-bold text-muted-foreground">{summary.skipped}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Counts by Company</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(summary.counts).map(([company, count]) => (
                  <div key={company} className="p-2 bg-muted rounded">
                    <p className="text-xs text-muted-foreground">{company}</p>
                    <p className="text-lg font-semibold">{count}</p>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={downloadExpandedCSV}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Expanded CSV
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
