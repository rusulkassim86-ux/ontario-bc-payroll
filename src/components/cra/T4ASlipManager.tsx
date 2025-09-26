import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText,
  Download,
  Eye,
  Plus,
  Edit,
  Send
} from 'lucide-react';
import { useCRAReports, T4ASlip } from '@/hooks/useCRAReports';

export function T4ASlipManager() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    recipientName: '',
    recipientSin: '',
    box20: 0,
    box22: 0,
    box48: 0,
  });
  
  const { 
    useT4ASlips, 
    updateSlipStatus,
    exportReport 
  } = useCRAReports();
  
  const { data: t4aSlips, isLoading } = useT4ASlips(selectedYear);

  const handleCreateT4A = async () => {
    // In real app, would call API to create T4A slip
    console.log('Creating T4A slip:', formData);
    setShowCreateForm(false);
    setFormData({
      recipientName: '',
      recipientSin: '',
      box20: 0,
      box22: 0,
      box48: 0,
    });
  };

  const handleUpdateStatus = async (slipId: string, status: string) => {
    updateSlipStatus.mutate({
      slipId,
      status,
      slipType: 't4a',
    });
  };

  const handleExportSlip = async (slip: T4ASlip, format: 'pdf' | 'xml') => {
    const filename = `T4A_${slip.recipient_name.replace(/\s+/g, '_')}_${slip.tax_year}.${format}`;
    await exportReport(format, slip, filename);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'finalized':
        return <Badge variant="secondary">Finalized</Badge>;
      case 'issued':
        return <Badge variant="default">Issued</Badge>;
      case 'amended':
        return <Badge variant="destructive">Amended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">T4A Slip Management</h2>
          <p className="text-muted-foreground">
            Generate and manage T4A slips for contractors and non-employment payments
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create T4A Slip
        </Button>
        
        {t4aSlips && t4aSlips.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export All (PDF)
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export XML
            </Button>
          </div>
        )}
      </div>

      {/* Create T4A Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New T4A Slip</CardTitle>
            <CardDescription>
              Enter recipient information and payment details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recipient-name">Recipient Name</Label>
                <Input
                  id="recipient-name"
                  value={formData.recipientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                  placeholder="Full name of recipient"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recipient-sin">SIN (Optional)</Label>
                <Input
                  id="recipient-sin"
                  value={formData.recipientSin}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipientSin: e.target.value }))}
                  placeholder="XXX-XXX-XXX"
                />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="box20">Box 20 - Self-Employed Commissions</Label>
                <Input
                  id="box20"
                  type="number"
                  step="0.01"
                  value={formData.box20}
                  onChange={(e) => setFormData(prev => ({ ...prev, box20: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="box22">Box 22 - Income Tax Deducted</Label>
                <Input
                  id="box22"
                  type="number"
                  step="0.01"
                  value={formData.box22}
                  onChange={(e) => setFormData(prev => ({ ...prev, box22: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="box48">Box 48 - Fees for Services</Label>
                <Input
                  id="box48"
                  type="number"
                  step="0.01"
                  value={formData.box48}
                  onChange={(e) => setFormData(prev => ({ ...prev, box48: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={handleCreateT4A}>Create T4A Slip</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* T4A Slips Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            T4A Slips ({selectedYear})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading T4A slips...</div>
          ) : t4aSlips && t4aSlips.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>SIN</TableHead>
                  <TableHead>Box 20</TableHead>
                  <TableHead>Box 22</TableHead>
                  <TableHead>Box 48</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {t4aSlips.map((slip) => (
                  <TableRow key={slip.id}>
                    <TableCell className="font-medium">
                      {slip.recipient_name}
                    </TableCell>
                    <TableCell>
                      {slip.recipient_sin ? '***-***-***' : 'Not provided'}
                    </TableCell>
                    <TableCell>
                      ${slip.box_20_self_employed_commissions.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      ${slip.box_22_income_tax_deducted.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      ${slip.box_48_fees_services.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${(slip.box_20_self_employed_commissions + slip.box_48_fees_services).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(slip.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>T4A Slip - {slip.recipient_name}</DialogTitle>
                              <DialogDescription>Tax year {slip.tax_year}</DialogDescription>
                            </DialogHeader>
                            <T4ASlipPreview slip={slip} />
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleExportSlip(slip, 'pdf')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        
                        {slip.status === 'finalized' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleUpdateStatus(slip.id, 'issued')}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No T4A slips found for {selectedYear}. Click "Create T4A Slip" to add one.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function T4ASlipPreview({ slip }: { slip: T4ASlip }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <h4 className="font-semibold">Recipient Information</h4>
          <div className="text-sm space-y-1">
            <div>Name: {slip.recipient_name}</div>
            <div>SIN: {slip.recipient_sin ? '***-***-***' : 'Not provided'}</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold">Slip Information</h4>
          <div className="text-sm space-y-1">
            <div>Tax Year: {slip.tax_year}</div>
            <div>Status: {getStatusBadge(slip.status)}</div>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <h4 className="font-semibold">T4A Details</h4>
        <div className="grid gap-2 text-sm">
          <div>Box 20 - Self-Employed Commissions: ${slip.box_20_self_employed_commissions.toFixed(2)}</div>
          <div>Box 22 - Income Tax Deducted: ${slip.box_22_income_tax_deducted.toFixed(2)}</div>
          <div>Box 48 - Fees for Services: ${slip.box_48_fees_services.toFixed(2)}</div>
          <div className="font-semibold">Total: ${(slip.box_20_self_employed_commissions + slip.box_48_fees_services).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'draft':
      return <Badge variant="outline">Draft</Badge>;
    case 'finalized':
      return <Badge variant="secondary">Finalized</Badge>;
    case 'issued':
      return <Badge variant="default">Issued</Badge>;
    case 'amended':
      return <Badge variant="destructive">Amended</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}