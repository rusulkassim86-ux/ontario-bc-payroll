import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, Download, Edit, Trash2 } from 'lucide-react';
import { useCRACompliance } from '@/hooks/useCRACompliance';
import { useToast } from '@/hooks/use-toast';

const T4_BOX_DESCRIPTIONS = {
  '14': 'Employment income',
  '16': 'CPP contributions',
  '18': 'EI premiums',
  '20': 'RPP contributions',
  '22': 'Income tax deducted',
  '24': 'EI insurable earnings',
  '26': 'CPP pensionable earnings',
  '28': 'Final pay period',
  '42': 'Employment commissions',
  '44': 'Union dues',
  '46': 'Charitable donations',
  '50': 'RPP or DPSP registration number',
  '52': 'Pension adjustment',
  '56': 'PPIP premiums',
  '58': 'PPIP insurable earnings'
};

export function T4BoxMappingManager() {
  const { t4BoxMappings, uploadT4BoxMappings, fetchT4BoxMappings, loading } = useCRACompliance();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadT4BoxMappings(selectedFile);
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('t4-mapping-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['pay_code', 'deduction_code', 't4_box', 'mapping_type', 'calculation_method'],
      ['REG', '', '14', 'earning', 'sum'],
      ['OT', '', '14', 'earning', 'sum'],
      ['', 'CPP', '16', 'deduction', 'sum'],
      ['', 'EI', '18', 'deduction', 'sum'],
      ['', 'FEDTAX', '22', 'tax', 'sum'],
      ['VAC', '', '14', 'earning', 'sum'],
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'T4_Box_Mapping_Template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
            <FileText className="w-5 h-5" />
            T4 Box Mapping Configuration
          </CardTitle>
          <CardDescription>
            Configure how pay codes and deductions map to T4 slip boxes for automatic year-end processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="t4-mapping-file">Upload CSV Mapping File</Label>
              <Input
                id="t4-mapping-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={loading}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button 
                onClick={handleUpload}
                disabled={!selectedFile || loading}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                {loading ? 'Uploading...' : 'Upload Mappings'}
              </Button>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current T4 Box Mappings</CardTitle>
          <CardDescription>
            {t4BoxMappings.length} active mappings configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {t4BoxMappings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>T4 Box</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Pay Code / Deduction</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Calculation</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {t4BoxMappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-mono font-semibold">
                      Box {mapping.t4_box}
                    </TableCell>
                    <TableCell className="text-sm">
                      {T4_BOX_DESCRIPTIONS[mapping.t4_box as keyof typeof T4_BOX_DESCRIPTIONS] || mapping.box_description}
                    </TableCell>
                    <TableCell>
                      {(mapping as any).pay_codes?.code || (mapping as any).deduction_codes?.code || 'N/A'}
                      <div className="text-xs text-muted-foreground">
                        {(mapping as any).pay_codes?.description || (mapping as any).deduction_codes?.description || ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getMappingTypeColor(mapping.mapping_type)}>
                        {mapping.mapping_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {mapping.calculation_method}
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
              <p>No T4 box mappings configured</p>
              <p className="text-sm">Upload a mapping file to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Common T4 Boxes Reference */}
      <Card>
        <CardHeader>
          <CardTitle>T4 Box Reference</CardTitle>
          <CardDescription>
            Common T4 boxes for payroll items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(T4_BOX_DESCRIPTIONS).map(([box, description]) => (
              <div key={box} className="p-3 border rounded-lg">
                <div className="font-mono font-semibold text-sm">Box {box}</div>
                <div className="text-sm text-muted-foreground">{description}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}