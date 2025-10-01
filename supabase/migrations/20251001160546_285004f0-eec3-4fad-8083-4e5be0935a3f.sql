-- Add additional hour columns to timesheets table for VAC, SICK, and other pay codes
-- This allows tracking of all pay code types used in timesheet entries

ALTER TABLE public.timesheets 
ADD COLUMN IF NOT EXISTS hours_vac numeric DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS hours_sick numeric DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS hours_other numeric DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS pay_code text,
ADD COLUMN IF NOT EXISTS time_in text,
ADD COLUMN IF NOT EXISTS time_out text,
ADD COLUMN IF NOT EXISTS department text;

-- Add comment to explain the columns
COMMENT ON COLUMN public.timesheets.hours_vac IS 'Hours recorded under vacation pay codes';
COMMENT ON COLUMN public.timesheets.hours_sick IS 'Hours recorded under sick leave pay codes';
COMMENT ON COLUMN public.timesheets.hours_other IS 'Hours recorded under other pay codes (BONUS, etc)';
COMMENT ON COLUMN public.timesheets.pay_code IS 'Primary pay code used for this timesheet entry';
COMMENT ON COLUMN public.timesheets.time_in IS 'Time in for shift (HH:MM format)';
COMMENT ON COLUMN public.timesheets.time_out IS 'Time out for shift (HH:MM format)';
COMMENT ON COLUMN public.timesheets.department IS 'Department or cost center code';
