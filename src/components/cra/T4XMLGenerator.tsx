import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FileDown, AlertCircle, CheckCircle, Shield, Settings, FileArchive, ExternalLink, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const T4XMLGenerator: React.FC = () => {
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear() - 1);
  const [environment, setEnvironment] = useState<'test' | 'production'>('test');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [xmlResult, setXmlResult] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [confirmationId, setConfirmationId] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('*')
      .single();
    
    if (data) {
      setSettings(data);
    }
  };

  const updateSettings = async (field: string, value: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .single();

    if (!profile?.company_id) return;

    await supabase
      .from('company_settings')
      .upsert({
        company_id: profile.company_id,
        [field]: value
      }, {
        onConflict: 'company_id'
      });

    loadSettings();
  };

  const generateXML = async () => {
    if (!settings?.cra_bn_rp || !settings?.transmitter_name) {
      toast({
        title: "Missing CRA credentials",
        description: "Please configure BN, WAC, and transmitter contact",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setValidationErrors([]);
    setXmlResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-t4-xml`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tax_year: taxYear,
            environment: environment,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setXmlResult(result);
        setShowInstructions(true);
        toast({
          title: "T4 XML generated successfully",
          description: `Generated for ${result.employee_count} employees`,
        });
      } else {
        if (result.errors) {
          setValidationErrors(result.errors);
        }
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadXML = () => {
    if (!xmlResult?.xml) return;

    const blob = new Blob([xmlResult.xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = xmlResult.filename || `T4_${taxYear}_${environment}_${Date.now()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "XML downloaded",
      description: "T4 XML file saved successfully",
    });
  };

  const saveConfirmation = async () => {
    if (!confirmationId || !xmlResult?.filing_id) return;

    const { error } = await supabase
      .from('cra_filing_records')
      .update({
        cra_confirmation_number: confirmationId,
        submission_status: 'submitted',
        filed_at: new Date().toISOString()
      })
      .eq('id', xmlResult.filing_id);

    if (error) {
      toast({
        title: "Error saving confirmation",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Confirmation saved",
      description: "CRA submission ID recorded successfully",
    });

    setConfirmationId('');
    setShowInstructions(false);
    setXmlResult(null);
  };

  return (
    <div className="space-y-6">
      {/* CRA Filing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            CRA Filing Configuration
          </CardTitle>
          <CardDescription>
            Configure credentials for CRA T4 XML filing via Internet File Transfer (IFT). 
            All credentials are stored securely and encrypted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business Number (BN RP Account)</Label>
              <Input
                type="text"
                placeholder="123456789RP0001"
                value={settings?.cra_bn_rp || ''}
                onChange={(e) => updateSettings('cra_bn_rp', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your 15-character CRA business number with RP suffix
              </p>
            </div>

            <div className="space-y-2">
              <Label>Web Access Code (WAC)</Label>
              <Input
                type="password"
                placeholder="Your WAC from CRA"
                value={settings?.cra_wac || ''}
                onChange={(e) => updateSettings('cra_wac', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required for CRA My Business Account access
              </p>
            </div>

            <div className="space-y-2">
              <Label>Transmitter Name</Label>
              <Input
                type="text"
                placeholder="Company Payroll Department"
                value={settings?.transmitter_name || ''}
                onChange={(e) => updateSettings('transmitter_name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Transmitter Email</Label>
              <Input
                type="email"
                placeholder="payroll@company.com"
                value={settings?.transmitter_email || ''}
                onChange={(e) => updateSettings('transmitter_email', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Transmitter Phone</Label>
              <Input
                type="tel"
                placeholder="555-555-5555"
                value={settings?.transmitter_phone || ''}
                onChange={(e) => updateSettings('transmitter_phone', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* T4 XML Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            Generate T4 XML for CRA Filing
          </CardTitle>
          <CardDescription>
            Create CRA-compliant T4 XML with all required boxes (14, 16, 18, 22, 24, 26, 44, 46, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tax Year</Label>
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
              <Label>Environment</Label>
              <Select 
                value={environment} 
                onValueChange={(value: 'test' | 'production') => setEnvironment(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test (Validation Only)</SelectItem>
                  <SelectItem value="production">Production (Actual Filing)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {environment === 'production' && (
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Production Mode:</strong> This will generate XML for actual CRA submission. 
                Ensure all employee data is accurate, finalized, and reviewed before proceeding.
              </AlertDescription>
            </Alert>
          )}

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Validation Errors Detected:</strong>
                <ul className="list-disc list-inside mt-2 max-h-48 overflow-y-auto">
                  {validationErrors.map((error, i) => (
                    <li key={i} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            <Button 
              onClick={generateXML}
              disabled={loading || !settings?.cra_bn_rp}
              className="flex-1"
            >
              {loading ? 'Generating...' : `Generate T4 XML (${environment})`}
            </Button>

            {xmlResult && (
              <Button onClick={downloadXML} variant="outline">
                <FileDown className="w-4 h-4 mr-2" />
                Download XML
              </Button>
            )}
          </div>

          {xmlResult && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>XML Generated Successfully</strong>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Employees:</span>
                      <Badge>{xmlResult.employee_count}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Environment:</span>
                      <Badge variant={environment === 'production' ? 'destructive' : 'secondary'}>
                        {xmlResult.environment}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Filing ID:</span>
                      <span className="font-mono text-xs">{xmlResult.filing_id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>File Hash:</span>
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        <span className="font-mono text-xs">{xmlResult.file_hash.substring(0, 16)}...</span>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {showInstructions && (
                <>
                  <Separator />
                  
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="text-base">Step-by-Step: CRA IFT Submission</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Badge className="mt-0.5">1</Badge>
                          <div>
                            <strong>Access CRA Internet File Transfer</strong>
                            <p className="text-muted-foreground mt-1">
                              Go to CRA My Business Account and navigate to Internet File Transfer (IFT)
                            </p>
                            <Button variant="outline" size="sm" className="mt-2" asChild>
                              <a href="https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-businesses/internet-file-transfer.html" target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Open CRA IFT
                              </a>
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Badge className="mt-0.5">2</Badge>
                          <div>
                            <strong>Enter Credentials</strong>
                            <p className="text-muted-foreground mt-1">
                              BN: <code className="bg-muted px-1 py-0.5 rounded">{settings?.cra_bn_rp}</code>
                              <br />
                              WAC: (your configured Web Access Code)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Badge className="mt-0.5">3</Badge>
                          <div>
                            <strong>Upload XML File</strong>
                            <p className="text-muted-foreground mt-1">
                              Select the downloaded T4 XML file and submit to CRA
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Badge className="mt-0.5">4</Badge>
                          <div>
                            <strong>Record Confirmation</strong>
                            <p className="text-muted-foreground mt-1">
                              After successful submission, enter the CRA confirmation/submission ID below
                            </p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label>CRA Confirmation/Submission ID</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter confirmation ID from CRA"
                            value={confirmationId}
                            onChange={(e) => setConfirmationId(e.target.value)}
                          />
                          <Button 
                            onClick={saveConfirmation}
                            disabled={!confirmationId}
                          >
                            Save
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          This will be stored with your filing record for audit purposes
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
