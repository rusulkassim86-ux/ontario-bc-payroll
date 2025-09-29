import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CostCenter {
  code: string;
  name: string;
  department: string | null;
  location_province: string | null;
  active: boolean;
}

export const CostCentersManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cost centers
  const { data: costCenters = [], isLoading } = useQuery({
    queryKey: ['cost-centers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .order('code');
      
      if (error) throw error;
      return data as CostCenter[];
    }
  });

  // Bulk import mutation
  const importMutation = useMutation({
    mutationFn: async (centers: Omit<CostCenter, 'created_at' | 'updated_at'>[]) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      const centersWithCompany = centers.map(center => ({
        ...center,
        company_id: profile.company_id
      }));

      const { error } = await supabase
        .from('cost_centers')
        .upsert(centersWithCompany, { onConflict: 'code' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      toast({ title: 'Import successful', description: 'Cost centers imported successfully.' });
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

  const parseCSV = (text: string): CostCenter[] => {
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
        name: row.name,
        department: row.department || null,
        location_province: row.locationprovince || null,
        active: row.active !== 'false'
      };
    });
  };

  const handleImport = async () => {
    if (!csvFile) return;

    try {
      const text = await csvFile.text();
      const centers = parseCSV(text);
      importMutation.mutate(centers);
    } catch (error) {
      toast({
        title: 'File parse error',
        description: 'Failed to parse CSV file.',
        variant: 'destructive'
      });
    }
  };

  const filteredCenters = costCenters.filter(center => {
    const matchesSearch = center.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (center.department && center.department.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesProvince = selectedProvince === 'all' || center.location_province === selectedProvince;
    return matchesSearch && matchesProvince;
  });

  const provinces = [
    'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cost Centers Management</h1>
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
            <CardTitle>Import Cost Centers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">CSV File</label>
              <p className="text-sm text-muted-foreground mb-2">
                Expected headers: code, name, department, locationProvince, active
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
                placeholder="Search by code, name, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedProvince} onValueChange={setSelectedProvince}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Provinces</SelectItem>
                {provinces.map(province => (
                  <SelectItem key={province} value={province}>{province}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cost Centers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Centers ({filteredCenters.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Province</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCenters.map((center) => (
                <TableRow key={center.code}>
                  <TableCell className="font-mono font-medium">{center.code}</TableCell>
                  <TableCell>{center.name}</TableCell>
                  <TableCell>{center.department || '—'}</TableCell>
                  <TableCell>
                    {center.location_province ? (
                      <Badge variant="outline">{center.location_province}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {center.active ? (
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