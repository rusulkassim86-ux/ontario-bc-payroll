import { UseFormReturn } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { useEmployees, type NewHireFormData } from "@/hooks/useEmployees";

interface PayrollGLStepProps {
  form: UseFormReturn<NewHireFormData>;
}

export function PayrollGLStep({ form }: PayrollGLStepProps) {
  const { useVacationPolicies } = useEmployees();
  const { data: vacationPolicies } = useVacationPolicies();

  const { watch } = form;
  const overtimeEligible = watch('overtime_eligible');
  const hireDate = watch('hire_date');

  return (
    <div className="space-y-6">
      {/* Province & Classification */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Employment Classification</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="province_code"
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
                    <SelectItem value="ON">Ontario (ON)</SelectItem>
                    <SelectItem value="BC">British Columbia (BC)</SelectItem>
                    <SelectItem value="AB">Alberta (AB)</SelectItem>
                    <SelectItem value="MB">Manitoba (MB)</SelectItem>
                    <SelectItem value="SK">Saskatchewan (SK)</SelectItem>
                    <SelectItem value="QC">Quebec (QC)</SelectItem>
                    <SelectItem value="NB">New Brunswick (NB)</SelectItem>
                    <SelectItem value="PE">Prince Edward Island (PE)</SelectItem>
                    <SelectItem value="NS">Nova Scotia (NS)</SelectItem>
                    <SelectItem value="NL">Newfoundland and Labrador (NL)</SelectItem>
                    <SelectItem value="YT">Yukon (YT)</SelectItem>
                    <SelectItem value="NT">Northwest Territories (NT)</SelectItem>
                    <SelectItem value="NU">Nunavut (NU)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="classification"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Classification</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select classification" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="journeyman">Journeyman</SelectItem>
                    <SelectItem value="apprentice-1">1st Year Apprentice</SelectItem>
                    <SelectItem value="apprentice-2">2nd Year Apprentice</SelectItem>
                    <SelectItem value="apprentice-3">3rd Year Apprentice</SelectItem>
                    <SelectItem value="apprentice-4">4th Year Apprentice</SelectItem>
                    <SelectItem value="foreman">Foreman</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="exempt">Exempt</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="union_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Union</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select union (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ibew-353">IBEW Local 353</SelectItem>
                    <SelectItem value="ibew-213">IBEW Local 213</SelectItem>
                    <SelectItem value="ua-170">UA Local 170</SelectItem>
                    <SelectItem value="non-union">Non-Union</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="step"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Step/Level</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    max="10" 
                    placeholder="1" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* GL & Cost Center */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">General Ledger Mapping</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="gl_cost_center"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Center / GL Segment</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cost center" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ops-toronto">OPS-Toronto</SelectItem>
                    <SelectItem value="ops-vancouver">OPS-Vancouver</SelectItem>
                    <SelectItem value="admin-head">Admin-Head Office</SelectItem>
                    <SelectItem value="project-a">Project A</SelectItem>
                    <SelectItem value="project-b">Project B</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Overtime Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Overtime & Compensation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="overtime_eligible"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Overtime Eligible</FormLabel>
                  <FormDescription>
                    Employee is eligible for overtime pay
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {overtimeEligible && (
            <FormField
              control={form.control}
              name="ot_multiplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>OT Multiplier</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1"
                      min="1" 
                      max="3" 
                      placeholder="1.5" 
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Overtime rate multiplier (e.g., 1.5 for time-and-a-half)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      </div>

      {/* Vacation & Dates */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Vacation & Seniority</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vacation_policy_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vacation Accrual Policy</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vacation policy" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vacationPolicies?.map((policy) => (
                      <SelectItem key={policy.id} value={policy.id}>
                        {policy.name} ({policy.accrual_rate_pct}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="seniority_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Seniority Date</FormLabel>
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
                          format(new Date(hireDate), "PPP")
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
                      selected={field.value ? new Date(field.value) : hireDate ? new Date(hireDate) : undefined}
                      onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Defaults to hire date if not specified
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}