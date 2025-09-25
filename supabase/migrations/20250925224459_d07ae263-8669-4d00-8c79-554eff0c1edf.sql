-- Create company pay periods table
CREATE TABLE public.company_pay_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  worksite_id UUID NULL,
  union_code TEXT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('biweekly', 'weekly', 'semi-monthly', 'monthly')),
  anchor_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Toronto',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, worksite_id, union_code)
);

-- Enable RLS
ALTER TABLE public.company_pay_periods ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Company members can view pay periods" 
ON public.company_pay_periods 
FOR SELECT 
USING (get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage pay periods" 
ON public.company_pay_periods 
FOR ALL 
USING (
  get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text]) 
  AND get_current_user_company() = company_id
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_company_pay_periods_updated_at
BEFORE UPDATE ON public.company_pay_periods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default policy for existing companies
INSERT INTO public.company_pay_periods (company_id, frequency, anchor_date, timezone)
SELECT 
  c.id,
  'biweekly',
  -- Find most recent Monday on or before today
  CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 6) % 7,
  COALESCE(c.settings->>'timezone', 'America/Toronto')
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_pay_periods cpp 
  WHERE cpp.company_id = c.id AND cpp.worksite_id IS NULL AND cpp.union_code IS NULL
);