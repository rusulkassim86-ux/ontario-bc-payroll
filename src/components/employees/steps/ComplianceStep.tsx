import React from "react";
import { UseFormReturn } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { type NewHireFormData } from "@/hooks/useEmployees";

interface ComplianceStepProps {
  form: UseFormReturn<NewHireFormData>;
}

export function ComplianceStep({ form }: ComplianceStepProps) {
  const { watch } = form;
  const workEligibility = watch('work_eligibility');
  const permitExpiry = watch('permit_expiry');
  const hireDate = watch('hire_date');

  // Calculate default probation end date
  const calculateProbationEnd = (hireDate: string) => {
    if (!hireDate) return '';
    const hire = new Date(hireDate);
    const probationEnd = new Date(hire);
    probationEnd.setDate(hire.getDate() + 90);
    return format(probationEnd, 'yyyy-MM-dd');
  };

  // Check for work permit warnings
  const showPermitWarning = () => {
    if (workEligibility === 'WorkPermit' && permitExpiry) {
      const expiryDate = new Date(permitExpiry);
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + 30);
      return expiryDate <= warningDate;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Work Eligibility */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Work Eligibility</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="work_eligibility"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work Eligibility Status *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select eligibility status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Citizen">Canadian Citizen</SelectItem>
                    <SelectItem value="PR">Permanent Resident</SelectItem>
                    <SelectItem value="WorkPermit">Work Permit</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {workEligibility === 'WorkPermit' && (
            <FormField
              control={form.control}
              name="permit_expiry"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Work Permit Expiry *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), "PPP")
                          ) : (
                            <span>Pick expiry date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                        disabled={(date) => date <= new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Must be a future date
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {showPermitWarning() && (
          <Alert className="border-warning/20 bg-warning/5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning-foreground">
              Work permit expires within 30 days. Please ensure renewal is in progress.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* TD1 Forms Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">TD1 Tax Forms</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="td1_federal_status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Federal TD1 Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="td1_provincial_status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provincial TD1 Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Social Insurance Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="123-456-789" 
                    {...field}
                    maxLength={11}
                  />
                </FormControl>
                <FormDescription>
                  Format: 123-456-789 (optional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="probation_end"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Probation End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), "PPP")
                        ) : hireDate ? (
                          format(new Date(calculateProbationEnd(hireDate)), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : hireDate ? new Date(calculateProbationEnd(hireDate)) : undefined}
                      onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                      disabled={(date) => date < new Date(hireDate || new Date())}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Defaults to hire date + 90 days
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Address Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Address Information</h3>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="address.street"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address *</FormLabel>
                <FormControl>
                  <Input placeholder="123 Main Street" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="address.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City *</FormLabel>
                  <FormControl>
                    <Input placeholder="Toronto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address.province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Province *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ON">Ontario</SelectItem>
                      <SelectItem value="BC">British Columbia</SelectItem>
                      <SelectItem value="AB">Alberta</SelectItem>
                      <SelectItem value="MB">Manitoba</SelectItem>
                      <SelectItem value="SK">Saskatchewan</SelectItem>
                      <SelectItem value="QC">Quebec</SelectItem>
                      <SelectItem value="NB">New Brunswick</SelectItem>
                      <SelectItem value="PE">Prince Edward Island</SelectItem>
                      <SelectItem value="NS">Nova Scotia</SelectItem>
                      <SelectItem value="NL">Newfoundland and Labrador</SelectItem>
                      <SelectItem value="YT">Yukon</SelectItem>
                      <SelectItem value="NT">Northwest Territories</SelectItem>
                      <SelectItem value="NU">Nunavut</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address.postal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Code *</FormLabel>
                  <FormControl>
                    <Input placeholder="M5V 3A8" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}