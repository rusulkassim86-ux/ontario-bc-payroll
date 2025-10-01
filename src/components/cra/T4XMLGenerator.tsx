import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, AlertCircle, CheckCircle, Shield, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const T4XMLGenerator: React.FC = () => {
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear() - 1);
  const [environment, setEnvironment] = useState<'test' | 'production'>('test');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [xmlResult, setXmlResult] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
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
        toast({
          title: "T4 XML generated",
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
    a.download = `T4_${taxYear}_${environment}_${Date.now()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "XML downloaded",
      description: "T4 XML file saved",
    });
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
            Configure credentials for CRA T4 XML filing (stored securely)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business Number (BN RP)</Label>
              <Input
                type="text"
                placeholder="123456789RP0001"
                value={settings?.cra_bn_rp || ''}
                onChange={(e) => updateSettings('cra_bn_rp', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Web Access Code (WAC)</Label>
              <Input
                type="password"
                placeholder="WAC123456"
                value={settings?.cra_wac || ''}
                onChange={(e) => updateSettings('cra_wac', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Transmitter Name</Label>
              <Input
                type="text"
                placeholder="Company Payroll Dept"
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
            Generate T4 XML
          </CardTitle>
          <CardDescription>
            Create CRA-compliant T4 XML for test or production submission
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
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {environment === 'production' && (
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Production Mode:</strong> This will generate XML for actual CRA submission. 
                Ensure all data is accurate and reviewed.
              </AlertDescription>
            </Alert>
          )}

          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Validation Errors:</strong>
                <ul className="list-disc list-inside mt-2">
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
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>XML Generated Successfully</strong>
                <div className="mt-2 space-y-1 text-sm">
                  <div>Employees: {xmlResult.employee_count}</div>
                  <div>Environment: <Badge>{xmlResult.environment}</Badge></div>
                  <div>Filing ID: {xmlResult.filing_id}</div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
