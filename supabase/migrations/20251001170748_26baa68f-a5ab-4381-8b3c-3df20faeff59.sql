-- Ensure earning_codes table has required columns
ALTER TABLE public.earning_codes 
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_in_timesheets boolean DEFAULT true,
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pay_code_company_map_company ON public.pay_code_company_map(company_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pay_code_company_map_earning ON public.pay_code_company_map(earning_code_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.pay_code_company_map ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Company members can view pay code mappings" ON public.pay_code_company_map;
  DROP POLICY IF EXISTS "Payroll admins can manage pay code mappings" ON public.pay_code_company_map;
END $$;

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

-- Update timesheets foreign key to point to earning_codes
DO $$
BEGIN
  ALTER TABLE public.timesheets DROP CONSTRAINT IF EXISTS timesheets_pay_code_id_fkey;
  ALTER TABLE public.timesheets ADD CONSTRAINT timesheets_pay_code_id_fkey 
    FOREIGN KEY (pay_code_id) REFERENCES public.earning_codes(id);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Seed earning codes for OZC
DO $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT id INTO v_company_id FROM companies LIMIT 1;
  
  INSERT INTO public.earning_codes (code, label, description, company_id, active, allow_in_timesheets, is_overtime, overtime_multiplier)
  VALUES 
    ('REG', 'Regular Hours', 'Regular Hours', v_company_id, true, true, false, 1.0),
    ('OT', 'Overtime 1.5x', 'Overtime 1.5x', v_company_id, true, true, true, 1.5),
    ('OT1', 'Overtime 1.5x Alt', 'Overtime 1.5x Alternate', v_company_id, true, true, true, 1.5),
    ('OT2', 'Overtime 2.0x', 'Overtime 2.0x', v_company_id, true, true, true, 2.0),
    ('SICK', 'Sick Leave', 'Sick Leave', v_company_id, true, true, false, 1.0),
    ('VAC', 'Vacation', 'Vacation', v_company_id, true, true, false, 1.0),
    ('BONUS', 'Bonus', 'Bonus Payment', v_company_id, true, false, false, 1.0)
  ON CONFLICT (code, company_id) DO UPDATE SET
    label = EXCLUDED.label,
    active = EXCLUDED.active,
    allow_in_timesheets = EXCLUDED.allow_in_timesheets;
END $$;

-- Seed pay_code_company_map for OZC
INSERT INTO public.pay_code_company_map (earning_code_id, company_code, is_active)
SELECT ec.id, 'OZC', true
FROM public.earning_codes ec
WHERE ec.code IN ('REG', 'OT', 'OT1', 'OT2', 'SICK', 'VAC', 'BONUS')
AND ec.active = true
ON CONFLICT (earning_code_id, company_code) DO UPDATE SET is_active = true;

-- Ensure OZC employees have company_code set
UPDATE public.employees
SET company_code = 'OZC'
WHERE employee_number IN ('324580', '324581', '324582', '324583')
AND (company_code IS NULL OR company_code != 'OZC');