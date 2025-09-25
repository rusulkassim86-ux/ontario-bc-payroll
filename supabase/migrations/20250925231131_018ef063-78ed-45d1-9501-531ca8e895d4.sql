-- Create pay_codes table
CREATE TABLE public.pay_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('earning', 'overtime', 'pto', 'premium', 'bank', 'deduction', 'benefit')),
  description TEXT,
  taxable_flags JSONB NOT NULL DEFAULT '{"federal": true, "cpp": true, "ei": true}'::jsonb,
  rate_type TEXT NOT NULL DEFAULT 'multiplier' CHECK (rate_type IN ('multiplier', 'flat_hourly', 'flat_amount')),
  multiplier NUMERIC,
  default_hourly_rate_source TEXT CHECK (default_hourly_rate_source IN ('employee', 'policy')),
  requires_hours BOOLEAN NOT NULL DEFAULT true,
  requires_amount BOOLEAN NOT NULL DEFAULT false,
  gl_earnings_code TEXT,
  province TEXT,
  union_code TEXT,
  worksite_id UUID,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Create employee_allowed_paycodes table
CREATE TABLE public.employee_allowed_paycodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  pay_code_id UUID NOT NULL REFERENCES public.pay_codes(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, pay_code_id)
);

-- Enable RLS
ALTER TABLE public.pay_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_allowed_paycodes ENABLE ROW LEVEL SECURITY;

-- Pay codes policies
CREATE POLICY "Company members can view pay codes"
ON public.pay_codes
FOR SELECT
USING (get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage pay codes"
ON public.pay_codes
FOR ALL
USING (
  get_current_user_role() = ANY(ARRAY['org_admin', 'payroll_admin']) 
  AND get_current_user_company() = company_id
);

-- Employee allowed pay codes policies
CREATE POLICY "Company members can view employee pay codes"
ON public.employee_allowed_paycodes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = employee_id 
    AND get_current_user_company() = e.company_id
  )
);

CREATE POLICY "Payroll admins can manage employee pay codes"
ON public.employee_allowed_paycodes
FOR ALL
USING (
  get_current_user_role() = ANY(ARRAY['org_admin', 'payroll_admin']) 
  AND EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = employee_id 
    AND get_current_user_company() = e.company_id
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_pay_codes_updated_at
  BEFORE UPDATE ON public.pay_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_allowed_paycodes_updated_at
  BEFORE UPDATE ON public.employee_allowed_paycodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pay codes for existing companies
INSERT INTO public.pay_codes (company_id, code, name, category, description, rate_type, multiplier)
SELECT 
  c.id,
  'REG',
  'Regular Hours',
  'earning',
  'Standard work hours',
  'multiplier',
  1.0
FROM companies c;

INSERT INTO public.pay_codes (company_id, code, name, category, description, rate_type, multiplier)
SELECT 
  c.id,
  'OT',
  'Overtime',
  'overtime',
  'Overtime hours at 1.5x rate',
  'multiplier',
  1.5
FROM companies c;

INSERT INTO public.pay_codes (company_id, code, name, category, description, rate_type, multiplier)
SELECT 
  c.id,
  'VAC',
  'Vacation',
  'pto',
  'Vacation time',
  'multiplier',
  1.0
FROM companies c;

INSERT INTO public.pay_codes (company_id, code, name, category, description, rate_type, multiplier)
SELECT 
  c.id,
  'SICK',
  'Sick Leave',
  'pto',
  'Sick leave time',
  'multiplier',
  1.0
FROM companies c;

INSERT INTO public.pay_codes (company_id, code, name, category, description, rate_type, multiplier)
SELECT 
  c.id,
  'STAT',
  'Statutory Holiday',
  'premium',
  'Statutory holiday pay',
  'multiplier',
  1.0
FROM companies c;