import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { usePayPeriods, type PayPeriod } from '@/hooks/usePayPeriods';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const formSchema = z.object({
  frequency: z.enum(['biweekly', 'weekly', 'semi-monthly', 'monthly']),
  anchor_date: z.string().min(1, 'Anchor date is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  worksite_id: z.string().optional(),
  union_code: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PayPeriodFormProps {
  payPeriod?: PayPeriod | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PayPeriodForm({ payPeriod, onSuccess, onCancel }: PayPeriodFormProps) {
  const { createPayPeriod, updatePayPeriod } = usePayPeriods();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      frequency: payPeriod?.frequency || 'biweekly',
      anchor_date: payPeriod?.anchor_date || format(new Date(), 'yyyy-MM-dd'),
      timezone: payPeriod?.timezone || 'America/Toronto',
      worksite_id: payPeriod?.worksite_id || '',
      union_code: payPeriod?.union_code || '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const payload = {
        frequency: data.frequency,
        anchor_date: data.anchor_date,
        timezone: data.timezone,
        worksite_id: data.worksite_id || null,
        union_code: data.union_code || null,
      };

      if (payPeriod) {
        await updatePayPeriod(payPeriod.id, payload);
        toast({
          title: 'Pay period updated',
          description: 'The pay period settings have been updated successfully.',
        });
      } else {
        await createPayPeriod(payload);
        toast({
          title: 'Pay period created',
          description: 'The new pay period has been created successfully.',
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save pay period',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pay Frequency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                  <SelectItem value="semi-monthly">Semi-Monthly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                How often employees are paid
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="anchor_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anchor Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormDescription>
                The start date of a known pay period (used to calculate all other periods)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="America/Toronto">Eastern Time (Toronto)</SelectItem>
                  <SelectItem value="America/Vancouver">Pacific Time (Vancouver)</SelectItem>
                  <SelectItem value="America/Winnipeg">Central Time (Winnipeg)</SelectItem>
                  <SelectItem value="America/Halifax">Atlantic Time (Halifax)</SelectItem>
                  <SelectItem value="America/Edmonton">Mountain Time (Edmonton)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Timezone for pay period calculations
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="worksite_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Worksite (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., ON-001" {...field} />
                </FormControl>
                <FormDescription>
                  Leave blank for company-wide policy
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="union_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Union Code (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., UNIFOR-123" {...field} />
                </FormControl>
                <FormDescription>
                  Leave blank for non-union policy
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center gap-2 pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : (payPeriod ? 'Update' : 'Create')} Pay Period
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}