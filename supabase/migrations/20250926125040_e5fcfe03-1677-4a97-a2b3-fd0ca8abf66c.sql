-- Create master pay_codes table
CREATE TABLE public.pay_codes_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Earnings', 'Deduction', 'Overtime', 'Benefit', 'Leave', 'Other')),
  company_scope TEXT NOT NULL DEFAULT 'All companies',
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on code
CREATE UNIQUE INDEX idx_pay_codes_master_code ON public.pay_codes_master (code);
CREATE INDEX idx_pay_codes_master_type ON public.pay_codes_master (type);
CREATE INDEX idx_pay_codes_master_active ON public.pay_codes_master (is_active);
CREATE INDEX idx_pay_codes_master_company_scope ON public.pay_codes_master (company_scope);

-- Create GL mapping table
CREATE TABLE public.pay_code_gl_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  gl_account TEXT NOT NULL,
  mapping_segment TEXT,
  company_scope TEXT NOT NULL DEFAULT 'All companies',
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for GL mapping
CREATE INDEX idx_pay_code_gl_map_code ON public.pay_code_gl_map (code);
CREATE INDEX idx_pay_code_gl_map_company_scope ON public.pay_code_gl_map (company_scope);

-- Enable RLS
ALTER TABLE public.pay_codes_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_code_gl_map ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pay_codes_master
CREATE POLICY "All authenticated users can view pay codes master" 
ON public.pay_codes_master 
FOR SELECT 
USING (true);

CREATE POLICY "Payroll admins can manage pay codes master" 
ON public.pay_codes_master 
FOR ALL 
USING (get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text]));

-- Create RLS policies for pay_code_gl_map
CREATE POLICY "All authenticated users can view GL mappings" 
ON public.pay_code_gl_map 
FOR SELECT 
USING (true);

CREATE POLICY "Payroll admins can manage GL mappings" 
ON public.pay_code_gl_map 
FOR ALL 
USING (get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text]));

-- Add trigger for updated_at
CREATE TRIGGER update_pay_codes_master_updated_at
BEFORE UPDATE ON public.pay_codes_master
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pay_code_gl_map_updated_at
BEFORE UPDATE ON public.pay_code_gl_map
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();