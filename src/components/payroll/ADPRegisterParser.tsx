import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, AlertCircle, Eye } from "lucide-react";

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
  const [showPreview, setShowPreview] = useState(false);
  const [earningCodes, setEarningCodes] = useState<any[]>([]);
  const [deductionCodes, setDeductionCodes] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const { toast } = useToast();

  const loadExistingCodes = async () => {
    setLoadingPreview(true);
    try {
      const [earningsRes, deductionsRes] = await Promise.all([
        supabase
          .from('earning_codes')
          .select('code, description, is_taxable_federal, is_taxable_provincial, is_cpp_pensionable, is_ei_insurable')
          .limit(50)
          .order('code'),
        supabase
          .from('deduction_codes')
          .select('code, label, category, is_employer_contribution, maps_to, active')
          .limit(50)
          .order('code')
      ]);

      if (earningsRes.error) throw earningsRes.error;
      if (deductionsRes.error) throw deductionsRes.error;

      setEarningCodes(earningsRes.data || []);
      setDeductionCodes(deductionsRes.data || []);
    } catch (err: any) {
      console.error('Error loading codes:', err);
      toast({
        title: "Failed to load codes",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (showPreview) {
      loadExistingCodes();
    }
  }, [showPreview]);

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
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
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

        <div className="mt-6 pt-6 border-t">
          <Button
            onClick={() => {
              setShowPreview(!showPreview);
              if (!showPreview) loadExistingCodes();
            }}
            variant="outline"
            className="w-full"
          >
            <Eye className="mr-2 h-4 w-4" />
            {showPreview ? 'Hide' : 'Show'} Current Pay Codes
          </Button>

          {showPreview && (
            <div className="mt-4 space-y-6">
              {loadingPreview ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Earning Codes ({earningCodes.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-auto max-h-96">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code</TableHead>
                              <TableHead>Label</TableHead>
                              <TableHead>Tax Fed</TableHead>
                              <TableHead>Tax Prov</TableHead>
                              <TableHead>CPP</TableHead>
                              <TableHead>EI</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {earningCodes.map((code) => (
                              <TableRow key={code.code}>
                                <TableCell className="font-mono">{code.code}</TableCell>
                                <TableCell>{code.description}</TableCell>
                                <TableCell>
                                  <Badge variant={code.is_taxable_federal ? "default" : "secondary"}>
                                    {code.is_taxable_federal ? 'Yes' : 'No'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={code.is_taxable_provincial ? "default" : "secondary"}>
                                    {code.is_taxable_provincial ? 'Yes' : 'No'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={code.is_cpp_pensionable ? "default" : "secondary"}>
                                    {code.is_cpp_pensionable ? 'Yes' : 'No'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={code.is_ei_insurable ? "default" : "secondary"}>
                                    {code.is_ei_insurable ? 'Yes' : 'No'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Deduction Codes ({deductionCodes.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-auto max-h-96">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code</TableHead>
                              <TableHead>Label</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Employer Contrib</TableHead>
                              <TableHead>Maps To</TableHead>
                              <TableHead>Active</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deductionCodes.map((code) => (
                              <TableRow key={code.code}>
                                <TableCell className="font-mono">{code.code}</TableCell>
                                <TableCell>{code.label}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{code.category || 'N/A'}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={code.is_employer_contribution ? "default" : "secondary"}>
                                    {code.is_employer_contribution ? 'Yes' : 'No'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs">{code.maps_to || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant={code.active ? "default" : "destructive"}>
                                    {code.active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
