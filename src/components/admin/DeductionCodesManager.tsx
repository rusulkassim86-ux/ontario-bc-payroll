import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Plus, FileDown, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface DeductionCode {
  code: string;
  label: string;
  category: 'Tax' | 'Benefit' | 'Retirement' | 'Union' | 'Other';
  is_employer_contribution: boolean;
  maps_to: string | null;
  active: boolean;
}

export const DeductionCodesManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch deduction codes
  const { data: deductionCodes = [], isLoading } = useQuery({
    queryKey: ['deduction-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deduction_codes')
        .select('*')
        .order('code');
      
      if (error) throw error;
      return data as DeductionCode[];
    }
  });

  // Bulk import mutation
  const importMutation = useMutation({
    mutationFn: async (codes: Omit<DeductionCode, 'created_at' | 'updated_at'>[]) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      const codesWithCompany = codes.map(code => ({
        ...code,
        description: code.label, // Map label to description for compatibility
        company_id: profile.company_id
      }));

      const { error } = await supabase
        .from('deduction_codes')
        .upsert(codesWithCompany, { onConflict: 'code' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deduction-codes'] });
      toast({ title: 'Import successful', description: 'Deduction codes imported successfully.' });
      setShowImportDialog(false);
      setCsvFile(null);
    },
    onError: (error) => {
      toast({ 
        title: 'Import failed', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please select a CSV file.',
        variant: 'destructive'
      });
    }
  };

  const parseCSV = (text: string): DeductionCode[] => {
    const lines = text.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      return {
        code: row.code,
        label: row.label,
        category: row.category,
        is_employer_contribution: row.isemployercontribution === 'true',
        maps_to: row.mapsto || null,
        active: row.active !== 'false'
      };
    });
  };

  const handleImport = async () => {
    if (!csvFile) return;

    try {
      const text = await csvFile.text();
      const codes = parseCSV(text);
      importMutation.mutate(codes);
    } catch (error) {
      toast({
        title: 'File parse error',
        description: 'Failed to parse CSV file.',
        variant: 'destructive'
      });
    }
  };

  const filteredCodes = deductionCodes.filter(code => {
    const matchesSearch = code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         code.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || code.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Tax': return 'bg-red-100 text-red-800';
      case 'Benefit': return 'bg-blue-100 text-blue-800';
      case 'Retirement': return 'bg-green-100 text-green-800';
      case 'Union': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Deduction Codes Management</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowImportDialog(true)}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
        </div>
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <Card>
          <CardHeader>
            <CardTitle>Import Deduction Codes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">CSV File</label>
              <p className="text-sm text-muted-foreground mb-2">
                Expected headers: code, label, category, isEmployerContribution, mapsTo, active
              </p>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleImport}
                disabled={!csvFile || importMutation.isPending}
              >
                {importMutation.isPending ? 'Importing...' : 'Import'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowImportDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by code or label..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Tax">Tax</SelectItem>
                <SelectItem value="Benefit">Benefit</SelectItem>
                <SelectItem value="Retirement">Retirement</SelectItem>
                <SelectItem value="Union">Union</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Deduction Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Deduction Codes ({filteredCodes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Employer Contribution</TableHead>
                <TableHead>Maps To</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCodes.map((code) => (
                <TableRow key={code.code}>
                  <TableCell className="font-mono font-medium">{code.code}</TableCell>
                  <TableCell>{code.label}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(code.category)}>
                      {code.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {code.is_employer_contribution ? (
                      <Badge className="bg-green-100 text-green-800">Yes</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {code.maps_to || '—'}
                  </TableCell>
                  <TableCell>
                    {code.active ? (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">Inactive</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};