import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, MapPin, Users } from 'lucide-react';
import { usePayPeriods } from '@/hooks/usePayPeriods';
import { PayPeriodForm } from './PayPeriodForm';
import { PayPeriodPreview } from './PayPeriodPreview';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

export function PayPeriodSettings() {
  const { payPeriods, loading, deletePayPeriod } = usePayPeriods();
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  if (loading) {
    return <div>Loading pay periods...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pay Period Settings</h2>
          <p className="text-muted-foreground">
            Configure pay period schedules for different worksites and unions
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Pay Period
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedPeriod ? 'Edit Pay Period' : 'Create Pay Period'}
              </DialogTitle>
              <DialogDescription>
                Configure a pay period schedule for your organization
              </DialogDescription>
            </DialogHeader>
            <PayPeriodForm
              payPeriod={selectedPeriod}
              onSuccess={() => {
                setIsFormOpen(false);
                setSelectedPeriod(null);
              }}
              onCancel={() => {
                setIsFormOpen(false);
                setSelectedPeriod(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {payPeriods.map((period) => (
          <Card key={period.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {period.frequency.charAt(0).toUpperCase() + period.frequency.slice(1)} Pay Period
                  </CardTitle>
                  <CardDescription>
                    Anchor Date: {format(new Date(period.anchor_date), 'MMM dd, yyyy')}
                    {period.timezone && ` • ${period.timezone}`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPeriod(period);
                      setIsFormOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deletePayPeriod(period.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {period.worksite_id && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Worksite Specific
                  </Badge>
                )}
                {period.union_code && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Union: {period.union_code}
                  </Badge>
                )}
                {!period.worksite_id && !period.union_code && (
                  <Badge variant="default">Default Policy</Badge>
                )}
              </div>
              
              <PayPeriodPreview period={period} />
            </CardContent>
          </Card>
        ))}

        {payPeriods.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pay Periods Configured</h3>
              <p className="text-muted-foreground text-center mb-4">
                Set up pay period schedules to manage timecard periods effectively
              </p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Pay Period
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}