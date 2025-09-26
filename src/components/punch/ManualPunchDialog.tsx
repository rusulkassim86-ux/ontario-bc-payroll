import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ManualPunchDialogProps {
  onAddPunch: (date: Date, time: string, direction: 'IN' | 'OUT') => Promise<void>;
  disabled?: boolean;
}

export function ManualPunchDialog({ onAddPunch, disabled }: ManualPunchDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [time, setTime] = useState('08:00');
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [adding, setAdding] = useState(false);

  const handleSubmit = async () => {
    try {
      setAdding(true);
      await onAddPunch(selectedDate, time, direction);
      setOpen(false);
      // Reset form
      setSelectedDate(new Date());
      setTime('08:00');
      setDirection('IN');
    } catch (error) {
      // Error is handled in the parent component
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Plus className="w-4 h-4 mr-2" />
          Add Manual Punch
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Manual Punch</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="direction">Direction</Label>
            <Select value={direction} onValueChange={(value: 'IN' | 'OUT') => setDirection(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">Punch IN</SelectItem>
                <SelectItem value="OUT">Punch OUT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={adding} className="flex-1">
              {adding ? 'Adding...' : 'Add Punch'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}