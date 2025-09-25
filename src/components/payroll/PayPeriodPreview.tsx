import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, addDays, addWeeks, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import type { PayPeriod } from '@/hooks/usePayPeriods';

interface PayPeriodPreviewProps {
  period: PayPeriod;
}

export function PayPeriodPreview({ period }: PayPeriodPreviewProps) {
  const calculateNextPeriods = (anchor: Date, frequency: string, count: number = 3) => {
    const periods = [];
    const today = new Date();
    
    // Find the current or next period from anchor
    let currentPeriodStart = new Date(anchor);
    
    // Calculate period length in days
    const getPeriodLength = (freq: string) => {
      switch (freq) {
        case 'weekly': return 7;
        case 'biweekly': return 14;
        case 'semi-monthly': return 15; // Approximate
        case 'monthly': return 30; // Approximate
        default: return 14;
      }
    };

    // Move to current/next period
    if (frequency === 'monthly' || frequency === 'semi-monthly') {
      // For monthly/semi-monthly, handle differently
      while (currentPeriodStart < today) {
        if (frequency === 'monthly') {
          currentPeriodStart = addMonths(currentPeriodStart, 1);
        } else {
          currentPeriodStart = addDays(currentPeriodStart, 15);
        }
      }
    } else {
      // For weekly/biweekly
      const periodLength = getPeriodLength(frequency);
      const daysDiff = Math.floor((today.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
      const periodsPassed = Math.floor(daysDiff / periodLength);
      
      if (periodsPassed > 0) {
        if (frequency === 'weekly') {
          currentPeriodStart = addWeeks(currentPeriodStart, periodsPassed);
        } else {
          currentPeriodStart = addDays(currentPeriodStart, periodsPassed * periodLength);
        }
      }
    }

    // Generate next periods
    for (let i = 0; i < count; i++) {
      let periodEnd: Date;
      
      switch (frequency) {
        case 'weekly':
          periodEnd = addDays(currentPeriodStart, 6);
          break;
        case 'biweekly':
          periodEnd = addDays(currentPeriodStart, 13);
          break;
        case 'semi-monthly':
          periodEnd = addDays(currentPeriodStart, 14);
          break;
        case 'monthly':
          periodEnd = endOfMonth(currentPeriodStart);
          break;
        default:
          periodEnd = addDays(currentPeriodStart, 13);
      }

      periods.push({
        start: new Date(currentPeriodStart),
        end: periodEnd,
      });

      // Move to next period
      switch (frequency) {
        case 'weekly':
          currentPeriodStart = addWeeks(currentPeriodStart, 1);
          break;
        case 'biweekly':
          currentPeriodStart = addDays(currentPeriodStart, 14);
          break;
        case 'semi-monthly':
          currentPeriodStart = addDays(currentPeriodStart, 15);
          break;
        case 'monthly':
          currentPeriodStart = addMonths(currentPeriodStart, 1);
          break;
      }
    }

    return periods;
  };

  const nextPeriods = calculateNextPeriods(new Date(period.anchor_date), period.frequency);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Upcoming Pay Periods</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {nextPeriods.map((p, index) => (
            <div key={index} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md">
              <span className="text-sm font-medium">
                Period {index + 1}
              </span>
              <span className="text-sm text-muted-foreground">
                {format(p.start, 'MMM dd')} – {format(p.end, 'MMM dd, yyyy')}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}