import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { usePayCodes, PayCode } from '@/hooks/usePayCodes';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  code: z.string().min(1, 'Code is required').max(10, 'Code must be 10 characters or less'),
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['earning', 'overtime', 'pto', 'premium', 'bank', 'deduction', 'benefit']),
  description: z.string().optional(),
  rate_type: z.enum(['multiplier', 'flat_hourly', 'flat_amount']),
  multiplier: z.number().optional(),
  default_hourly_rate_source: z.enum(['employee', 'policy']).optional(),
  requires_hours: z.boolean(),
  requires_amount: z.boolean(),
  gl_earnings_code: z.string().optional(),
  province: z.string().optional(),
  union_code: z.string().optional(),
  worksite_id: z.string().optional(),
  effective_from: z.string(),
  effective_to: z.string().optional(),
  taxable_flags: z.object({
    federal: z.boolean(),
    cpp: z.boolean(),
    ei: z.boolean(),
  }),
});

type FormData = z.infer<typeof formSchema>;

interface PayCodeFormProps {
  payCode?: PayCode | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PayCodeForm({ payCode, onSuccess, onCancel }: PayCodeFormProps) {
  const { createPayCode, updatePayCode } = usePayCodes();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: payCode?.code || '',
      name: payCode?.name || '',
      category: payCode?.category || 'earning',
      description: payCode?.description || '',
      rate_type: payCode?.rate_type || 'multiplier',
      multiplier: payCode?.multiplier || 1.0,
      default_hourly_rate_source: payCode?.default_hourly_rate_source || undefined,
      requires_hours: payCode?.requires_hours ?? true,
      requires_amount: payCode?.requires_amount ?? false,
      gl_earnings_code: payCode?.gl_earnings_code || '',
      province: payCode?.province || '',
      union_code: payCode?.union_code || '',
      worksite_id: payCode?.worksite_id || '',
      effective_from: payCode?.effective_from || new Date().toISOString().split('T')[0],
      effective_to: payCode?.effective_to || '',
      taxable_flags: {
        federal: payCode?.taxable_flags?.federal ?? true,
        cpp: payCode?.taxable_flags?.cpp ?? true,
        ei: payCode?.taxable_flags?.ei ?? true,
      },
    },
  });

  const rateType = form.watch('rate_type');

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);

      // Clean up the data
      const cleanData = {
        ...data,
        multiplier: data.rate_type === 'multiplier' ? data.multiplier : undefined,
        province: data.province || undefined,
        union_code: data.union_code || undefined,
        worksite_id: data.worksite_id || undefined,
        gl_earnings_code: data.gl_earnings_code || undefined,
        effective_to: data.effective_to || undefined,
        default_hourly_rate_source: data.default_hourly_rate_source || undefined,
      };

      if (payCode) {
        await updatePayCode(payCode.id, cleanData as Partial<PayCode>);
      } else {
        await createPayCode({
          ...cleanData,
          company_id: '', // This will be set by the backend function
          active: true,
        } as Omit<PayCode, 'id' | 'created_at' | 'updated_at'>);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving pay code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code *</FormLabel>
                <FormControl>
                  <Input placeholder="REG" {...field} className="font-mono" />
                </FormControl>
                <FormDescription>
                  Short unique identifier (e.g., REG, OT, VAC)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Regular Hours" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="earning">Earning</SelectItem>
                    <SelectItem value="overtime">Overtime</SelectItem>
                    <SelectItem value="pto">PTO</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                    <SelectItem value="benefit">Benefit</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rate_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rate Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rate type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="multiplier">Multiplier</SelectItem>
                    <SelectItem value="flat_hourly">Flat Hourly</SelectItem>
                    <SelectItem value="flat_amount">Flat Amount</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {rateType === 'multiplier' && (
          <FormField
            control={form.control}
            name="multiplier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Multiplier</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.1" 
                    placeholder="1.0" 
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>
                  Rate multiplier (e.g., 1.0 for regular, 1.5 for overtime)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional description..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Taxable Flags */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Settings</CardTitle>
            <CardDescription>Configure how this pay code affects taxation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="taxable_flags.federal"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Federal Tax</FormLabel>
                      <FormDescription className="text-xs">Subject to federal income tax</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxable_flags.cpp"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>CPP</FormLabel>
                      <FormDescription className="text-xs">Subject to CPP contributions</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxable_flags.ei"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>EI</FormLabel>
                      <FormDescription className="text-xs">Subject to EI premiums</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Input Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requires_hours"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Requires Hours</FormLabel>
                      <FormDescription className="text-xs">Hours input required</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requires_amount"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Requires Amount</FormLabel>
                      <FormDescription className="text-xs">Amount input required</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Additional Fields */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="gl_earnings_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GL Earnings Code</FormLabel>
                <FormControl>
                  <Input placeholder="5100" {...field} />
                </FormControl>
                <FormDescription>General ledger account code</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="province"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Province (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="ON" {...field} />
                </FormControl>
                <FormDescription>Restrict to specific province</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="effective_from"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective From *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="effective_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective To</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>Leave blank for no end date</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : payCode ? 'Update Pay Code' : 'Create Pay Code'}
          </Button>
        </div>
      </form>
    </Form>
  );
}