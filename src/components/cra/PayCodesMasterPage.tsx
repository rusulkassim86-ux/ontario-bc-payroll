import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, FileText, Settings, CheckCircle, AlertCircle, Edit, Trash2, FileDown } from 'lucide-react';
import { useCRAIntegration } from '@/hooks/useCRAIntegration';
import { useT4Mapping } from '@/hooks/useT4Mapping';

const COMPANY_CODES = ['72R', '72S', 'OZC'];

const DEFAULT_MAPPINGS = {
  '72R': [
    { pay_code: 'REG', cra_box: '14', mapping_type: 'earning', box_description: 'Employment income' },
    { pay_code: 'OT', cra_box: '14', mapping_type: 'earning', box_description: 'Employment income' },
    { pay_code: 'VAC', cra_box: '14', mapping_type: 'earning', box_description: 'Employment income' },
    { pay_code: 'STAT', cra_box: '14', mapping_type: 'earning', box_description: 'Employment income' },
    { deduction_code: 'CPP', cra_box: '16', mapping_type: 'deduction', box_description: 'CPP contributions' },
    { deduction_code: 'EI', cra_box: '18', mapping_type: 'deduction', box_description: 'EI premiums' },
    { deduction_code: 'FEDTAX', cra_box: '22', mapping_type: 'tax', box_description: 'Income tax deducted' },
    { deduction_code: 'PROVTAX', cra_box: '22', mapping_type: 'tax', box_description: 'Income tax deducted' },
  ],
  '72S': [
    { pay_code: 'REGULAR', cra_box: '14', mapping_type: 'earning', box_description: 'Employment income' },
    { pay_code: 'OVERTIME', cra_box: '14', mapping_type: 'earning', box_description: 'Employment income' },
    { pay_code: 'VACATION', cra_box: '14', mapping_type: 'earning', box_description: 'Employment income' },
    { deduction_code: 'CPP', cra_box: '16', mapping_type: 'deduction', box_description: 'CPP contributions' },
    { deduction_code: 'EI', cra_box: '18', mapping_type: 'deduction', box_description: 'EI premiums' },
    { deduction_code: 'INCOMETAX', cra_box: '22', mapping_type: 'tax', box_description: 'Income tax deducted' },
  ],
  'OZC': [
    { pay_code: 'BASE', cra_box: '14', mapping_type: 'earning', box_description: 'Employment income' },
    { pay_code: 'PREMIUM', cra_box: '14', mapping_type: 'earning', box_description: 'Employment income' },
    { pay_code: 'BONUS', cra_box: '14', mapping_type: 'earning', box_description: 'Employment income' },
    { deduction_code: 'CPP_DED', cra_box: '16', mapping_type: 'deduction', box_description: 'CPP contributions' },
    { deduction_code: 'EI_DED', cra_box: '18', mapping_type: 'deduction', box_description: 'EI premiums' },
    { deduction_code: 'TAX_DED', cra_box: '22', mapping_type: 'tax', box_description: 'Income tax deducted' },
  ]
};

export function PayCodesMasterPage() {
  const { 
    paycodeMappings, 
    fetchPaycodeMappings, 
    uploadPaycodeMappingFile, 
    loading 
  } = useCRAIntegration();
  
  const { downloadMapping, uploadMapping, loadDefaults: loadDefaultMappings } = useT4Mapping();
  
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>('72R');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingT4, setUploadingT4] = useState(false);

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadPaycodeMappingFile(selectedFile, selectedCompanyCode);
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('paycode-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['company_code', 'pay_code', 'deduction_code', 'cra_box', 'mapping_type', 'gl_account', 'cost_center', 'department_code'],
      ['72R', 'REG', '', '14', 'earning', '5100', 'CC001', 'ADMIN'],
      ['72R', 'OT', '', '14', 'earning', '5100', 'CC001', 'ADMIN'],
      ['72R', '', 'CPP', '16', 'deduction', '2310', 'CC001', 'ADMIN'],
      ['72R', '', 'EI', '18', 'deduction', '2320', 'CC001', 'ADMIN'],
      ['72R', '', 'FEDTAX', '22', 'tax', '2330', 'CC001', 'ADMIN'],
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Paycode_CRA_Mapping_Template_${selectedCompanyCode}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadCurrentMapping = async () => {
    await downloadMapping(selectedCompanyCode);
  };

  const handleT4Upload = async (file: File) => {
    setUploadingT4(true);
    try {
      await uploadMapping(file, selectedCompanyCode);
      // Clear the file input
      const fileInput = document.getElementById('t4-mapping-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('T4 upload error:', error);
    } finally {
      setUploadingT4(false);
    }
  };

  const loadDefaults = async (companyCode: string) => {
    await loadDefaultMappings(companyCode);
  };

  const filteredMappings = paycodeMappings.filter(m => m.company_code === selectedCompanyCode);

  const getMappingTypeColor = (type: string) => {
    switch (type) {
      case 'earning': return 'bg-green-100 text-green-800';
      case 'deduction': return 'bg-blue-100 text-blue-800';
      case 'tax': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Pay Codes Master Configuration
          </CardTitle>
          <CardDescription>
            Map pay codes and deductions to CRA T4 boxes for automatic year-end processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCompanyCode} onValueChange={setSelectedCompanyCode} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              {COMPANY_CODES.map(code => (
                <TabsTrigger key={code} value={code}>
                  Company {code}
                </TabsTrigger>
              ))}
            </TabsList>

            {COMPANY_CODES.map(companyCode => (
              <TabsContent key={companyCode} value={companyCode} className="space-y-6">
                {/* Upload Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Payroll Items Mapping
                    </CardTitle>
                    <CardDescription>
                      Upload CSV/XLSX file with payroll item to CRA box mappings for company {companyCode}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="paycode-file">Upload File</Label>
                        <Input
                          id="paycode-file"
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          disabled={loading}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button 
                          onClick={handleFileUpload}
                          disabled={!selectedFile || loading}
                          className="w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {loading ? 'Uploading...' : 'Upload Mapping'}
                        </Button>
                      </div>
                      <div className="flex items-end gap-2">
                        <Button variant="outline" onClick={downloadTemplate} className="flex-1">
                          <Download className="w-4 h-4 mr-2" />
                          Template
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={downloadCurrentMapping}
                          className="flex-1"
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          Download Mapping
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => loadDefaults(companyCode)}
                          className="flex-1"
                        >
                          Load Defaults
                        </Button>
                      </div>
                    </div>

                    {/* New T4 Mapping Upload Section */}
                    <div className="border-t pt-4 mt-4">
                      <div className="mb-4">
                        <h4 className="font-semibold flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4" />
                          T4 Mapping Upload
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Upload T4 mapping CSV with validation (company_code, item_type, item_code, flags, CRA boxes)
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="t4-mapping-file">T4 Mapping File</Label>
                          <Input
                            id="t4-mapping-file"
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleT4Upload(file);
                            }}
                            disabled={uploadingT4}
                          />
                        </div>
                        <div className="flex items-end">
                          <p className="text-sm text-muted-foreground">
                            {uploadingT4 ? 'Validating and uploading...' : 'Select a file to upload T4 mappings'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Current Mappings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Current Mappings for Company {companyCode}</CardTitle>
                    <CardDescription>
                      {filteredMappings.length} active mappings configured
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredMappings.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pay Code</TableHead>
                            <TableHead>Deduction Code</TableHead>
                            <TableHead>CRA Box</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>GL Account</TableHead>
                            <TableHead>Cost Center</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Flags</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMappings.map((mapping) => (
                            <TableRow key={mapping.id}>
                              <TableCell className="font-mono">
                                {mapping.pay_code || '-'}
                              </TableCell>
                              <TableCell className="font-mono">
                                {mapping.deduction_code || '-'}
                              </TableCell>
                              <TableCell className="font-mono font-semibold">
                                Box {mapping.cra_box}
                              </TableCell>
                              <TableCell className="text-sm">
                                {mapping.box_description}
                              </TableCell>
                              <TableCell>
                                <Badge className={getMappingTypeColor(mapping.mapping_type)}>
                                  {mapping.mapping_type}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {mapping.gl_account || '-'}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {mapping.cost_center || '-'}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {mapping.department_code || '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {mapping.is_cpp_pensionable && (
                                    <Badge variant="outline" className="text-xs">CPP</Badge>
                                  )}
                                  {mapping.is_ei_insurable && (
                                    <Badge variant="outline" className="text-xs">EI</Badge>
                                  )}
                                  {mapping.is_taxable_federal && (
                                    <Badge variant="outline" className="text-xs">Fed Tax</Badge>
                                  )}
                                  {mapping.is_vacation_eligible && (
                                    <Badge variant="outline" className="text-xs">Vac Pay</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No paycode mappings configured for company {companyCode}</p>
                        <p className="text-sm">Upload a mapping file or load defaults to get started</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Default Mappings Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Default Mappings for Company {companyCode}</CardTitle>
                    <CardDescription>
                      Recommended mappings based on common payroll configurations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pay Code</TableHead>
                          <TableHead>Deduction Code</TableHead>
                          <TableHead>CRA Box</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {DEFAULT_MAPPINGS[companyCode as keyof typeof DEFAULT_MAPPINGS]?.map((mapping, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono">
                              {mapping.pay_code || '-'}
                            </TableCell>
                            <TableCell className="font-mono">
                              {mapping.deduction_code || '-'}
                            </TableCell>
                            <TableCell className="font-mono font-semibold">
                              Box {mapping.cra_box}
                            </TableCell>
                            <TableCell>
                              <Badge className={getMappingTypeColor(mapping.mapping_type)}>
                                {mapping.mapping_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {mapping.box_description}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}