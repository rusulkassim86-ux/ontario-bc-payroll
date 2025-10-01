-- Ensure earning_codes table has required columns
ALTER TABLE public.earning_codes 
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_in_timesheets boolean DEFAULT true;

-- Add label column if it doesn't exist (map from description)
ALTER TABLE public.earning_codes 
ADD COLUMN IF NOT EXISTS label text;

-- Update label from description where null
UPDATE public.earning_codes 
SET label = description 
WHERE label IS NULL;

-- Create pay_code_company_map table
CREATE TABLE IF NOT EXISTS public.pay_code_company_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  earning_code_id UUID NOT NULL REFERENCES public.earning_codes(id) ON DELETE CASCADE,
  company_code TEXT NOT NULL,
  worksite_id UUID REFERENCES public.worksites(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(earning_code_id, company_code)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_pay_code_company_map_company ON public.pay_code_company_map(company_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pay_code_company_map_earning ON public.pay_code_company_map(earning_code_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.pay_code_company_map ENABLE ROW LEVEL SECURITY;

-- RLS policies for pay_code_company_map
CREATE POLICY "Company members can view pay code mappings"
ON public.pay_code_company_map FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.company_code = pay_code_company_map.company_code
    AND get_current_user_company() = e.company_id
  )
);

CREATE POLICY "Payroll admins can manage pay code mappings"
ON public.pay_code_company_map FOR ALL
USING (
  get_current_user_role() IN ('org_admin', 'payroll_admin')
);

-- Update timesheets foreign key to point to earning_codes instead of pay_codes_master
ALTER TABLE public.timesheets 
DROP CONSTRAINT IF EXISTS timesheets_pay_code_id_fkey,
ADD CONSTRAINT timesheets_pay_code_id_fkey 
  FOREIGN KEY (pay_code_id) REFERENCES public.earning_codes(id);

-- Seed earning codes for OZC if they don't exist
INSERT INTO public.earning_codes (code, label, description, company_id, active, allow_in_timesheets, is_overtime, overtime_multiplier)
SELECT 'REG', 'Regular Hours', 'Regular Hours', c.id, true, true, false, 1.0
FROM companies c WHERE c.cra_business_number LIKE '%' LIMIT 1
ON CONFLICT (code, company_id) DO NOTHING;

INSERT INTO public.earning_codes (code, label, description, company_id, active, allow_in_timesheets, is_overtime, overtime_multiplier)
SELECT 'OT', 'Overtime 1.5x', 'Overtime 1.5x', c.id, true, true, true, 1.5
FROM companies c WHERE c.cra_business_number LIKE '%' LIMIT 1
ON CONFLICT (code, company_id) DO NOTHING;

INSERT INTO public.earning_codes (code, label, description, company_id, active, allow_in_timesheets, is_overtime, overtime_multiplier)
SELECT 'OT1', 'Overtime 1.5x Alt', 'Overtime 1.5x Alternate', c.id, true, true, true, 1.5
FROM companies c WHERE c.cra_business_number LIKE '%' LIMIT 1
ON CONFLICT (code, company_id) DO NOTHING;

INSERT INTO public.earning_codes (code, label, description, company_id, active, allow_in_timesheets, is_overtime, overtime_multiplier)
SELECT 'OT2', 'Overtime 2.0x', 'Overtime 2.0x', c.id, true, true, true, 2.0
FROM companies c WHERE c.cra_business_number LIKE '%' LIMIT 1
ON CONFLICT (code, company_id) DO NOTHING;

INSERT INTO public.earning_codes (code, label, description, company_id, active, allow_in_timesheets, is_overtime, overtime_multiplier)
SELECT 'SICK', 'Sick Leave', 'Sick Leave', c.id, true, true, false, 1.0
FROM companies c WHERE c.cra_business_number LIKE '%' LIMIT 1
ON CONFLICT (code, company_id) DO NOTHING;

INSERT INTO public.earning_codes (code, label, description, company_id, active, allow_in_timesheets, is_overtime, overtime_multiplier)
SELECT 'VAC', 'Vacation', 'Vacation', c.id, true, true, false, 1.0
FROM companies c WHERE c.cra_business_number LIKE '%' LIMIT 1
ON CONFLICT (code, company_id) DO NOTHING;

INSERT INTO public.earning_codes (code, label, description, company_id, active, allow_in_timesheets, is_overtime, overtime_multiplier)
SELECT 'BONUS', 'Bonus', 'Bonus Payment', c.id, true, false, false, 1.0
FROM companies c WHERE c.cra_business_number LIKE '%' LIMIT 1
ON CONFLICT (code, company_id) DO NOTHING;

-- Seed pay_code_company_map for OZC
INSERT INTO public.pay_code_company_map (earning_code_id, company_code, is_active)
SELECT ec.id, 'OZC', true
FROM public.earning_codes ec
WHERE ec.code IN ('REG', 'OT', 'OT1', 'OT2', 'SICK', 'VAC', 'BONUS')
AND ec.active = true
ON CONFLICT (earning_code_id, company_code) DO UPDATE SET is_active = true;

-- Ensure the 4 OZC employees have company_code set
UPDATE public.employees
SET company_code = 'OZC'
WHERE employee_number IN ('324580', '324581', '324582', '324583')
AND (company_code IS NULL OR company_code != 'OZC');