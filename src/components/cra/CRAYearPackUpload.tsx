import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Calendar, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const CRAYearPackUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [activePack, setActivePack] = useState<any>(null);
  const [rateChanges, setRateChanges] = useState<any[]>([]);
  const [showYearWarning, setShowYearWarning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadActivePack();
    loadRateChanges();
  }, []);

  useEffect(() => {
    if (activePack) {
      const currentYear = new Date().getFullYear();
      setShowYearWarning(activePack.tax_year !== currentYear);
    }
  }, [activePack]);

  const loadActivePack = async () => {
    const { data } = await supabase
      .from('cra_year_packs')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (data) setActivePack(data);
  };

  const loadRateChanges = async () => {
    const { data } = await supabase
      .from('cra_rate_changes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) setRateChanges(data);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate filename format
      if (!file.name.match(/cra_year_pack_\d{4}\.(xlsx|csv)/i)) {
        toast({
          title: "Invalid filename",
          description: "File must be named cra_year_pack_YYYY.xlsx or .csv",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-cra-year-pack`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (result.success) {
        setUploadResult(result);
        setSelectedFile(null);
        loadActivePack();
        loadRateChanges();
        
        toast({
          title: "Year pack uploaded",
          description: `CRA Year Pack ${result.tax_year} is now active`,
        });

        // Reset file input
        const fileInput = document.getElementById('year-pack-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Year Warning Banner */}
      {showYearWarning && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> Active tax year ({activePack.tax_year}) is not the current calendar year ({new Date().getFullYear()}). 
            Payroll calculations will use {activePack.tax_year} rates.
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            CRA Year Pack Upload
          </CardTitle>
          <CardDescription>
            Upload complete CRA tax rate package (CPP, EI, Federal, Provincial). 
            File must be named: <code className="text-sm bg-muted px-2 py-1 rounded">cra_year_pack_YYYY.xlsx</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="year-pack-file">Select Year Pack File</Label>
            <Input
              id="year-pack-file"
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileChange}
              disabled={loading}
            />
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                {selectedFile.name}
                <Badge variant="secondary">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </Badge>
              </div>
            )}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Expected sheets:</strong> CPP, EI, Federal, ON, BC
              <br />
              This will automatically update tax rules and deactivate previous packs for the same year.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || loading}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {loading ? 'Uploading...' : 'Upload and Activate Year Pack'}
          </Button>

          {uploadResult && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Success!</strong> {uploadResult.message}
                {uploadResult.changes?.length > 0 && (
                  <div className="mt-2 text-sm">
                    Detected {uploadResult.changes.length} rate change(s) from previous year.
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Active Pack Info */}
      {activePack && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Active Tax Year: {activePack.tax_year}
            </CardTitle>
            <CardDescription>
              All payroll calculations will use rates from this year pack
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Uploaded</div>
                <div className="font-medium">
                  {new Date(activePack.uploaded_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Filename</div>
                <div className="font-medium text-sm">{activePack.filename}</div>
              </div>
            </div>

            {activePack.pack_data?.cpp && (
              <div className="pt-4 border-t">
                <div className="text-sm font-semibold mb-2">Rate Summary:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>CPP Employee: {((activePack.pack_data.cpp.employee_rate || 0.0595) * 100).toFixed(2)}%</div>
                  <div>EI Employee: {((activePack.pack_data.ei?.employee_rate || 0.0166) * 100).toFixed(2)}%</div>
                  <div>CPP Max: ${(activePack.pack_data.cpp.max_pensionable || 68500).toLocaleString()}</div>
                  <div>EI Max: ${(activePack.pack_data.ei?.max_insurable || 63600).toLocaleString()}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rate Changes Comparison */}
      {rateChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Rate Changes
            </CardTitle>
            <CardDescription>
              Compare year-over-year rate changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rateChanges.map((change, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">
                      {change.from_year} → {change.to_year}
                    </span>
                    <Badge variant="outline">
                      {change.change_details?.changes?.length || 0} changes
                    </Badge>
                  </div>
                  {change.change_details?.changes?.map((detail: any, i: number) => (
                    <div key={i} className="text-sm text-muted-foreground">
                      <strong>{detail.type}:</strong> {(detail.old_value * 100).toFixed(3)}% → {(detail.new_value * 100).toFixed(3)}%
                      <span className={detail.change > 0 ? 'text-red-500' : 'text-green-500'}>
                        {' '}({detail.change > 0 ? '+' : ''}{(detail.change * 100).toFixed(3)}%)
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
