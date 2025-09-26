import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePayCodesMaster, PayCodeMaster } from '@/hooks/usePayCodesMaster';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PayCodeMasterFormProps {
  payCode?: PayCodeMaster | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PayCodeMasterForm({ payCode, onSuccess, onCancel }: PayCodeMasterFormProps) {
  const { createPayCode, updatePayCode } = usePayCodesMaster();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    code: payCode?.code || '',
    description: payCode?.description || '',
    type: payCode?.type || 'Earnings' as PayCodeMaster['type'],
    company_scope: payCode?.company_scope || 'All companies',
    is_active: payCode?.is_active ?? true,
    effective_from: payCode?.effective_from ? new Date(payCode.effective_from) : null as Date | null,
    effective_to: payCode?.effective_to ? new Date(payCode.effective_to) : null as Date | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.description.trim()) return;

    setLoading(true);
    try {
      const data = {
        code: formData.code.trim(),
        description: formData.description.trim(),
        type: formData.type,
        company_scope: formData.company_scope.trim(),
        is_active: formData.is_active,
        effective_from: formData.effective_from?.toISOString().split('T')[0],
        effective_to: formData.effective_to?.toISOString().split('T')[0],
      };

      if (payCode) {
        await updatePayCode(payCode.id, data);
      } else {
        await createPayCode(data);
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving pay code:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Code *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
            placeholder="e.g., REG, OT1, VAC"
            required
            disabled={!!payCode} // Don't allow editing code after creation
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type *</Label>
          <Select 
            value={formData.type} 
            onValueChange={(value: PayCodeMaster['type']) => 
              setFormData(prev => ({ ...prev, type: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Earnings">Earnings</SelectItem>
              <SelectItem value="Deduction">Deduction</SelectItem>
              <SelectItem value="Overtime">Overtime</SelectItem>
              <SelectItem value="Benefit">Benefit</SelectItem>
              <SelectItem value="Leave">Leave</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Detailed description of the pay code"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="company_scope">Company Scope</Label>
        <Input
          id="company_scope"
          value={formData.company_scope}
          onChange={(e) => setFormData(prev => ({ ...prev, company_scope: e.target.value }))}
          placeholder="e.g., All companies, TOR, BCO"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Effective From</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.effective_from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.effective_from ? format(formData.effective_from, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.effective_from || undefined}
                onSelect={(date) => setFormData(prev => ({ ...prev, effective_from: date || null }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Effective To</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.effective_to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.effective_to ? format(formData.effective_to, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.effective_to || undefined}
                onSelect={(date) => setFormData(prev => ({ ...prev, effective_to: date || null }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
        <Label htmlFor="is_active">Active</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : payCode ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}