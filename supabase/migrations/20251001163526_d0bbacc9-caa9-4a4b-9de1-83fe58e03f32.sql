-- Add allow_in_timesheets flag to pay_codes_master table
ALTER TABLE public.pay_codes_master 
ADD COLUMN IF NOT EXISTS allow_in_timesheets boolean DEFAULT true NOT NULL;

-- Update existing earning codes to be available in timesheets
UPDATE public.pay_codes_master 
SET allow_in_timesheets = true 
WHERE type IN ('Earnings', 'Overtime', 'Leave')
AND is_active = true;

-- Add comment
COMMENT ON COLUMN public.pay_codes_master.allow_in_timesheets IS 'Flag to control whether this pay code appears in timesheet entry dropdowns';