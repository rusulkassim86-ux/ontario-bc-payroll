import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Settings, Upload, FileText } from 'lucide-react';
import { usePayCodesMaster, PayCodeMaster } from '@/hooks/usePayCodesMaster';
import { PayCodesMasterImport } from './PayCodesMasterImport';
import { PayCodeMasterForm } from './PayCodeMasterForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const typeColors = {
  Earnings: 'bg-green-100 text-green-800',
  Deduction: 'bg-red-100 text-red-800',
  Overtime: 'bg-orange-100 text-orange-800',
  Benefit: 'bg-blue-100 text-blue-800',
  Leave: 'bg-purple-100 text-purple-800',
  Other: 'bg-gray-100 text-gray-800',
};

export function PayCodesMasterPage() {
  const { payCodes, loading, deactivatePayCode } = usePayCodesMaster();
  const [selectedPayCode, setSelectedPayCode] = useState<PayCodeMaster | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('active');
  const [activeTab, setActiveTab] = useState('browse');

  const getFilteredPayCodes = () => {
    return payCodes.filter(payCode => {
      const matchesSearch = payCode.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           payCode.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || payCode.type === typeFilter;
      const matchesScope = scopeFilter === 'all' || payCode.company_scope === scopeFilter;
      const matchesActive = activeFilter === 'all' || 
                           (activeFilter === 'active' && payCode.is_active) ||
                           (activeFilter === 'inactive' && !payCode.is_active);
      return matchesSearch && matchesType && matchesScope && matchesActive;
    });
  };

  const getUniqueScopes = () => {
    const scopes = new Set(payCodes.map(pc => pc.company_scope));
    return Array.from(scopes).sort();
  };

  const getTypeStats = () => {
    const stats: Record<string, number> = {};
    payCodes.forEach(pc => {
      if (pc.is_active) {
        stats[pc.type] = (stats[pc.type] || 0) + 1;
      }
    });
    return stats;
  };

  if (loading) {
    return <div>Loading pay codes...</div>;
  }

  const filteredCodes = getFilteredPayCodes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Master Pay Codes</h1>
          <p className="text-muted-foreground">
            Manage master pay code library for all payroll systems
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Pay Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedPayCode ? 'Edit Pay Code' : 'Create Pay Code'}
                </DialogTitle>
                <DialogDescription>
                  Configure a master pay code for the organization
                </DialogDescription>
              </DialogHeader>
              <PayCodeMasterForm
                payCode={selectedPayCode}
                onSuccess={() => {
                  setIsFormOpen(false);
                  setSelectedPayCode(null);
                }}
                onCancel={() => {
                  setIsFormOpen(false);
                  setSelectedPayCode(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse">Browse Pay Codes</TabsTrigger>
          <TabsTrigger value="import">Import from ADP</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {Object.entries(getTypeStats()).map(([type, count]) => (
              <Card key={type}>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground">{type}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search codes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Earnings">Earnings</SelectItem>
                    <SelectItem value="Deduction">Deduction</SelectItem>
                    <SelectItem value="Overtime">Overtime</SelectItem>
                    <SelectItem value="Benefit">Benefit</SelectItem>
                    <SelectItem value="Leave">Leave</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={scopeFilter} onValueChange={setScopeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scopes</SelectItem>
                    {getUniqueScopes().map(scope => (
                      <SelectItem key={scope} value={scope}>{scope}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={activeFilter} onValueChange={setActiveFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground flex items-center">
                  {filteredCodes.length} of {payCodes.length} codes
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pay Codes Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Company Scope</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCodes.map((payCode) => (
                    <TableRow key={payCode.id}>
                      <TableCell className="font-mono font-medium">
                        {payCode.code}
                      </TableCell>
                      <TableCell>{payCode.description}</TableCell>
                      <TableCell>
                        <Badge className={typeColors[payCode.type]}>
                          {payCode.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payCode.company_scope}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payCode.is_active ? "default" : "secondary"}>
                          {payCode.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPayCode(payCode);
                              setIsFormOpen(true);
                            }}
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          {payCode.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deactivatePayCode(payCode.id)}
                            >
                              Deactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredCodes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Pay Codes Found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchTerm || typeFilter !== 'all' || scopeFilter !== 'all' 
                      ? 'No pay codes match your current filters'
                      : 'Create your first pay code to get started'
                    }
                  </p>
                  {!searchTerm && typeFilter === 'all' && scopeFilter === 'all' && (
                    <Button onClick={() => setIsFormOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Pay Code
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <PayCodesMasterImport />
        </TabsContent>
      </Tabs>
    </div>
  );
}