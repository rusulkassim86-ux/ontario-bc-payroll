-- Add gl_account and active columns to t4_paycode_mapping
ALTER TABLE public.t4_paycode_mapping
ADD COLUMN IF NOT EXISTS gl_account text,
ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Update item_type check constraint to include new types
ALTER TABLE public.t4_paycode_mapping
DROP CONSTRAINT IF EXISTS t4_paycode_mapping_item_type_check;

ALTER TABLE public.t4_paycode_mapping
ADD CONSTRAINT t4_paycode_mapping_item_type_check
CHECK (item_type IN ('EARNING', 'DEDUCTION', 'BENEFIT', 'TAX', 'EMPLOYER', 'NETPAY'));