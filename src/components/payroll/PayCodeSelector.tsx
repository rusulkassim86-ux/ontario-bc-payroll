import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useEmployeePayCodes, PayCode } from '@/hooks/usePayCodes';

interface PayCodeSelectorProps {
  employeeId: string;
  value?: string;
  onChange: (payCode: PayCode | null) => void;
  disabled?: boolean;
}

const categoryColors = {
  earning: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  overtime: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  pto: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  premium: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  bank: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  deduction: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  benefit: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
};

export function PayCodeSelector({ employeeId, value, onChange, disabled }: PayCodeSelectorProps) {
  const { allowedPayCodes, loading } = useEmployeePayCodes(employeeId);
  const [open, setOpen] = useState(false);
  const [selectedPayCode, setSelectedPayCode] = useState<PayCode | null>(null);

  // Find the currently selected pay code
  useEffect(() => {
    if (value && allowedPayCodes.length > 0) {
      const payCode = allowedPayCodes.find(pc => pc.code === value);
      setSelectedPayCode(payCode || null);
    } else {
      setSelectedPayCode(null);
    }
  }, [value, allowedPayCodes]);

  const handleSelect = (payCode: PayCode) => {
    setSelectedPayCode(payCode);
    onChange(payCode);
    setOpen(false);
  };

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

  if (loading) {
    return (
      <Button variant="outline" className="w-full justify-between" disabled>
        Loading...
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled}
            >
              {selectedPayCode ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono">{selectedPayCode.code}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="truncate">{selectedPayCode.name}</span>
                </div>
              ) : (
                "Select pay code..."
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search pay codes..." />
              <CommandEmpty>No pay code found.</CommandEmpty>
              <CommandList>
                <CommandGroup>
                  {allowedPayCodes.map((payCode) => (
                    <CommandItem
                      key={payCode.id}
                      value={`${payCode.code} ${payCode.name}`}
                      onSelect={() => handleSelect(payCode)}
                      className="flex items-center justify-between p-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Check
                          className={cn(
                            "h-4 w-4",
                            selectedPayCode?.id === payCode.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-mono font-semibold">{payCode.code}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="truncate">{payCode.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className={cn("text-xs", categoryColors[payCode.category])}>
                          {payCode.category}
                        </Badge>
                        {formatMultiplier(payCode) && (
                          <Badge variant="outline" className="text-xs">
                            {formatMultiplier(payCode)}
                          </Badge>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {selectedPayCode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1 text-sm">
                <div><strong>Description:</strong> {selectedPayCode.description}</div>
                <div><strong>Rate Type:</strong> {selectedPayCode.rate_type}</div>
                {selectedPayCode.multiplier && (
                  <div><strong>Multiplier:</strong> {selectedPayCode.multiplier}x</div>
                )}
                <div><strong>Taxable:</strong> Fed: {selectedPayCode.taxable_flags.federal ? 'Yes' : 'No'}, CPP: {selectedPayCode.taxable_flags.cpp ? 'Yes' : 'No'}, EI: {selectedPayCode.taxable_flags.ei ? 'Yes' : 'No'}</div>
                {selectedPayCode.gl_earnings_code && (
                  <div><strong>GL Code:</strong> {selectedPayCode.gl_earnings_code}</div>
                )}
                <div><strong>Hours Required:</strong> {selectedPayCode.requires_hours ? 'Yes' : 'No'}</div>
                <div><strong>Amount Required:</strong> {selectedPayCode.requires_amount ? 'Yes' : 'No'}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}