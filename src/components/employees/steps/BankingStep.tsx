import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { type NewHireFormData } from "@/hooks/useEmployees";

interface BankingStepProps {
  form: UseFormReturn<NewHireFormData>;
}

export function BankingStep({ form }: BankingStepProps) {
  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Banking information is optional and can be added later. Employee can receive paper checks until direct deposit is set up.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Direct Deposit Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="banking_info.bank_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank Name</FormLabel>
                <FormControl>
                  <Input placeholder="TD Canada Trust" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="banking_info.routing_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transit/Routing Number</FormLabel>
                <FormControl>
                  <Input placeholder="12345" {...field} />
                </FormControl>
                <FormDescription>
                  5-digit transit number
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="banking_info.account_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Number</FormLabel>
                <FormControl>
                  <Input placeholder="1234567890" {...field} />
                </FormControl>
                <FormDescription>
                  Bank account number (will be encrypted)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Security Notice</h4>
          <p className="text-sm text-muted-foreground">
            All banking information is encrypted and stored securely. Only authorized payroll administrators can access this information.
          </p>
        </div>
      </div>
    </div>
  );
}