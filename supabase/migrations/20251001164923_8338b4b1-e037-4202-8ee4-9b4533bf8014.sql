-- Add pay_code_id column to timesheets table to reference pay_codes_master
ALTER TABLE public.timesheets 
ADD COLUMN pay_code_id UUID REFERENCES public.pay_codes_master(id);

-- Create index for better query performance
CREATE INDEX idx_timesheets_pay_code_id ON public.timesheets(pay_code_id);

-- Add comment explaining the relationship
COMMENT ON COLUMN public.timesheets.pay_code_id IS 'Foreign key reference to pay_codes_master table for proper pay code tracking';

-- Update existing records to link pay_code string to pay_code_id where possible
UPDATE public.timesheets t
SET pay_code_id = pcm.id
FROM public.pay_codes_master pcm
WHERE t.pay_code = pcm.code
AND t.pay_code_id IS NULL;