import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Settings, Info } from 'lucide-react';
import { usePayCodes, PayCode } from '@/hooks/usePayCodes';
import { PayCodeForm } from './PayCodeForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const categoryColors = {
  earning: 'bg-green-100 text-green-800',
  overtime: 'bg-orange-100 text-orange-800',
  pto: 'bg-blue-100 text-blue-800',
  premium: 'bg-purple-100 text-purple-800',
  bank: 'bg-yellow-100 text-yellow-800',
  deduction: 'bg-red-100 text-red-800',
  benefit: 'bg-indigo-100 text-indigo-800',
};

export function PayCodesSettings() {
  const { payCodes, loading, deletePayCode } = usePayCodes();
  const [selectedPayCode, setSelectedPayCode] = useState<PayCode | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredPayCodes = payCodes.filter(payCode => {
    const matchesSearch = payCode.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payCode.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || payCode.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatMultiplier = (payCode: PayCode) => {
    if (payCode.rate_type === 'multiplier' && payCode.multiplier) {
      return `${payCode.multiplier}x`;
    }
    if (payCode.rate_type === 'flat_hourly') {
      return 'Flat/hr';
    }
    if (payCode.rate_type === 'flat_amount') {
      return 'Amount';
    }
    return '';
  };

  const getCalculationPreview = (payCode: PayCode) => {
    switch (payCode.rate_type) {
      case 'multiplier':
        return `Hours × Base Rate × ${payCode.multiplier || 1.0}`;
      case 'flat_hourly':
        return `Hours × Fixed Rate`;
      case 'flat_amount':
        return `Fixed Amount (no hours)`;
      default:
        return 'Standard calculation';
    }
  };

  if (loading) {
    return <div>Loading pay codes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pay Codes</h2>
          <p className="text-muted-foreground">
            Configure pay codes for earnings, overtime, PTO, and deductions
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Pay Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {selectedPayCode ? 'Edit Pay Code' : 'Create Pay Code'}
              </DialogTitle>
              <DialogDescription>
                Configure a pay code for payroll calculations
              </DialogDescription>
            </DialogHeader>
            <PayCodeForm
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search pay codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="earning">Earning</SelectItem>
                <SelectItem value="overtime">Overtime</SelectItem>
                <SelectItem value="pto">PTO</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="deduction">Deduction</SelectItem>
                <SelectItem value="benefit">Benefit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pay Codes Grid */}
      <div className="grid gap-4">
        {filteredPayCodes.map((payCode) => (
          <Card key={payCode.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <span className="font-mono text-lg">{payCode.code}</span>
                    <Badge className={categoryColors[payCode.category]}>
                      {payCode.category}
                    </Badge>
                    {formatMultiplier(payCode) && (
                      <Badge variant="outline">{formatMultiplier(payCode)}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{payCode.name}</CardDescription>
                  {payCode.description && (
                    <p className="text-sm text-muted-foreground">{payCode.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Info className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1 text-sm">
                          <div><strong>Calculation:</strong> {getCalculationPreview(payCode)}</div>
                          <div><strong>Taxable:</strong> Fed: {payCode.taxable_flags.federal ? 'Yes' : 'No'}, CPP: {payCode.taxable_flags.cpp ? 'Yes' : 'No'}, EI: {payCode.taxable_flags.ei ? 'Yes' : 'No'}</div>
                          {payCode.gl_earnings_code && <div><strong>GL Code:</strong> {payCode.gl_earnings_code}</div>}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deletePayCode(payCode.id)}
                  >
                    Deactivate
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div>Hours Required: {payCode.requires_hours ? 'Yes' : 'No'}</div>
                <div>Amount Required: {payCode.requires_amount ? 'Yes' : 'No'}</div>
                {payCode.province && <div>Province: {payCode.province}</div>}
                {payCode.union_code && <div>Union: {payCode.union_code}</div>}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredPayCodes.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pay Codes Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || categoryFilter !== 'all' 
                  ? 'No pay codes match your current filters'
                  : 'Create your first pay code to get started'
                }
              </p>
              {!searchTerm && categoryFilter === 'all' && (
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Pay Code
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}