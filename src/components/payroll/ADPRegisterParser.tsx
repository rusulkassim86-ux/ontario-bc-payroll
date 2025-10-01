import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

interface ParseResult {
  success: boolean;
  summary: {
    earningCodes: number;
    deductionCodes: number;
    glMappings: number;
  };
  codes: {
    earnings: Array<{ code: string; label: string; glAccount?: string }>;
    deductions: Array<{ code: string; label: string; glAccount?: string }>;
  };
}

export function ADPRegisterParser() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setParsing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('file', file);

      const { data, error: invokeError } = await supabase.functions.invoke('parse-adp-register', {
        body: formData,
      });

      if (invokeError) throw invokeError;

      setResult(data);
      toast({
        title: "Successfully parsed ADP register",
        description: `Created ${data.summary.earningCodes} earning codes and ${data.summary.deductionCodes} deduction codes`,
      });
    } catch (err: any) {
      console.error('Error parsing register:', err);
      setError(err.message || 'Failed to parse register');
      toast({
        title: "Parse failed",
        description: err.message || 'Failed to parse register',
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ADP Payroll Register Parser</CardTitle>
        <CardDescription>
          Upload an ADP payroll register to automatically extract and create earning codes, deduction codes, and GL mappings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="flex-1"
          />
          <Button
            onClick={handleParse}
            disabled={!file || parsing}
          >
            <Upload className="mr-2 h-4 w-4" />
            {parsing ? 'Parsing...' : 'Parse & Import'}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Successfully imported {result.summary.earningCodes} earning codes, {result.summary.deductionCodes} deduction codes, and {result.summary.glMappings} GL mappings.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Earning Codes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {result.codes.earnings.map((code) => (
                      <div key={code.code} className="flex justify-between">
                        <span className="font-mono">{code.code}</span>
                        <span className="text-muted-foreground">{code.label}</span>
                        {code.glAccount && (
                          <span className="font-mono text-xs">{code.glAccount}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Deduction Codes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {result.codes.deductions.map((code) => (
                      <div key={code.code} className="flex justify-between">
                        <span className="font-mono">{code.code}</span>
                        <span className="text-muted-foreground">{code.label}</span>
                        {code.glAccount && (
                          <span className="font-mono text-xs">{code.glAccount}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
