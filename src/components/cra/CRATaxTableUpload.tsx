import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCRACompliance } from '@/hooks/useCRACompliance';

export function CRATaxTableUpload() {
  const { uploadTaxTables, taxTables, loading } = useCRACompliance();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());
  const [uploadResult, setUploadResult] = useState<any>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const result = await uploadTaxTables(selectedFile, taxYear);
      setUploadResult(result);
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('tax-table-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const currentYearTables = taxTables.filter(table => table.tax_year === taxYear);
  const jurisdictions = [...new Set(currentYearTables.map(table => table.jurisdiction))];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            CRA Tax Tables Upload
          </CardTitle>
          <CardDescription>
            Upload CRA federal and provincial tax tables for automatic payroll tax calculations.
            Supports ON and BC provinces with federal tax tables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tax-year">Tax Year</Label>
              <Select 
                value={taxYear.toString()} 
                onValueChange={(value) => setTaxYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax-table-file">Upload Excel File</Label>
              <Input
                id="tax-table-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>
          </div>

          {selectedFile && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ready to upload: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || loading}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {loading ? 'Uploading...' : 'Upload Tax Tables'}
          </Button>

          {uploadResult && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Successfully imported {uploadResult.imported_count} tax table entries for {taxYear}.
                {uploadResult.errors?.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {uploadResult.errors.length} rows had errors and were skipped.
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Current Tax Tables Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Tax Tables ({taxYear})</CardTitle>
          <CardDescription>
            Summary of loaded tax tables for the selected year
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jurisdictions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {jurisdictions.map(jurisdiction => {
                const jurisdictionTables = currentYearTables.filter(table => table.jurisdiction === jurisdiction);
                const payPeriodTypes = [...new Set(jurisdictionTables.map(table => table.pay_period_type))];
                
                return (
                  <div key={jurisdiction} className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-lg mb-2">
                      {jurisdiction === 'federal' ? 'Federal' : `Province: ${jurisdiction.toUpperCase()}`}
                    </h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>{jurisdictionTables.length} tax brackets</p>
                      <p>Pay periods: {payPeriodTypes.join(', ')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No tax tables loaded for {taxYear}</p>
              <p className="text-sm">Upload CRA tax tables to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Download */}
      <Card>
        <CardHeader>
          <CardTitle>Template Files</CardTitle>
          <CardDescription>
            Download template files to ensure correct format for uploads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Download CRA Tax Tables Template
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Download CPP/EI Template
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}