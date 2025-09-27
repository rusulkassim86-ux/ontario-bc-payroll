-- Create CRA tax tables for federal and provincial tax calculations
CREATE TABLE public.cra_tax_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jurisdiction TEXT NOT NULL, -- 'federal', 'ON', 'BC', etc.
  tax_year INTEGER NOT NULL,
  pay_period_type TEXT NOT NULL, -- 'weekly', 'biweekly', 'semimonthly', 'monthly'
  income_from NUMERIC NOT NULL,
  income_to NUMERIC NOT NULL,
  tax_amount NUMERIC NOT NULL,
  effective_start DATE NOT NULL,
  effective_end DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create T4 box mapping table
CREATE TABLE public.t4_box_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pay_code_id UUID REFERENCES public.pay_codes(id),
  deduction_code_id UUID REFERENCES public.deduction_codes(id),
  t4_box TEXT NOT NULL, -- '14', '16', '18', '22', etc.
  box_description TEXT NOT NULL,
  mapping_type TEXT NOT NULL, -- 'earning', 'deduction', 'tax'
  calculation_method TEXT NOT NULL DEFAULT 'sum', -- 'sum', 'ytd', 'custom'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ROE (Record of Employment) table
CREATE TABLE public.roe_slips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  roe_number TEXT UNIQUE NOT NULL,
  serial_number TEXT,
  payroll_reference_number TEXT,
  first_day_worked DATE NOT NULL,
  last_day_worked DATE NOT NULL,
  final_pay_period_end DATE NOT NULL,
  reason_for_issuing TEXT NOT NULL, -- 'A', 'B', 'C', etc.
  insurable_hours NUMERIC NOT NULL DEFAULT 0,
  insurable_earnings NUMERIC NOT NULL DEFAULT 0,
  total_insurable_earnings NUMERIC NOT NULL DEFAULT 0,
  vacation_pay NUMERIC NOT NULL DEFAULT 0,
  statutory_holiday_pay NUMERIC NOT NULL DEFAULT 0,
  other_monies JSONB NOT NULL DEFAULT '{}',
  pay_period_details JSONB NOT NULL DEFAULT '[]',
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create CRA filing compliance log
CREATE TABLE public.cra_compliance_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  compliance_type TEXT NOT NULL, -- 't4', 'roe', 'remittance'
  entity_id UUID NOT NULL,
  compliance_status TEXT NOT NULL DEFAULT 'pending',
  validation_errors JSONB DEFAULT '[]',
  filed_at TIMESTAMP WITH TIME ZONE,
  filed_by UUID,
  cra_confirmation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_cra_tax_tables_jurisdiction_year ON public.cra_tax_tables(jurisdiction, tax_year);
CREATE INDEX idx_cra_tax_tables_income_range ON public.cra_tax_tables(income_from, income_to);
CREATE INDEX idx_t4_box_mappings_pay_code ON public.t4_box_mappings(pay_code_id);
CREATE INDEX idx_roe_slips_employee ON public.roe_slips(employee_id);
CREATE INDEX idx_cra_compliance_log_company ON public.cra_compliance_log(company_id);

-- Enable RLS
ALTER TABLE public.cra_tax_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t4_box_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roe_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cra_compliance_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for CRA tax tables
CREATE POLICY "All authenticated users can view CRA tax tables" 
ON public.cra_tax_tables 
FOR SELECT 
USING (true);

CREATE POLICY "Only org admins can manage CRA tax tables" 
ON public.cra_tax_tables 
FOR ALL 
USING (get_current_user_role() = 'org_admin');

-- RLS Policies for T4 box mappings
CREATE POLICY "Company members can view T4 box mappings" 
ON public.t4_box_mappings 
FOR SELECT 
USING (true);

CREATE POLICY "Payroll admins can manage T4 box mappings" 
ON public.t4_box_mappings 
FOR ALL 
USING (get_current_user_role() IN ('org_admin', 'payroll_admin'));

-- RLS Policies for ROE slips
CREATE POLICY "Company members can view ROE slips" 
ON public.roe_slips 
FOR SELECT 
USING (get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage ROE slips" 
ON public.roe_slips 
FOR ALL 
USING (get_current_user_role() IN ('org_admin', 'payroll_admin') AND get_current_user_company() = company_id);

-- RLS Policies for CRA compliance log
CREATE POLICY "Company members can view CRA compliance log" 
ON public.cra_compliance_log 
FOR SELECT 
USING (get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage CRA compliance log" 
ON public.cra_compliance_log 
FOR ALL 
USING (get_current_user_role() IN ('org_admin', 'payroll_admin') AND get_current_user_company() = company_id);

-- Create function to auto-generate ROE number
CREATE OR REPLACE FUNCTION public.generate_roe_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  sequence_num TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Get next sequence number for this year
  SELECT LPAD((COUNT(*) + 1)::TEXT, 6, '0')
  INTO sequence_num
  FROM public.roe_slips 
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  RETURN 'ROE' || current_year || sequence_num;
END;
$$;

-- Create function to calculate CRA taxes
CREATE OR REPLACE FUNCTION public.calculate_cra_taxes(
  gross_income NUMERIC,
  pay_periods_per_year INTEGER,
  jurisdiction TEXT,
  tax_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  annual_income NUMERIC;
  pay_period_income NUMERIC;
  tax_amount NUMERIC := 0;
  tax_record RECORD;
BEGIN
  -- Convert to annual income for tax calculation
  annual_income := gross_income * pay_periods_per_year;
  
  -- Find applicable tax bracket
  SELECT tax_amount INTO tax_amount
  FROM public.cra_tax_tables
  WHERE jurisdiction = calculate_cra_taxes.jurisdiction
    AND tax_year = calculate_cra_taxes.tax_year
    AND pay_period_type = CASE pay_periods_per_year
        WHEN 52 THEN 'weekly'
        WHEN 26 THEN 'biweekly'
        WHEN 24 THEN 'semimonthly'
        WHEN 12 THEN 'monthly'
        ELSE 'biweekly'
      END
    AND gross_income >= income_from 
    AND gross_income < income_to
    AND is_active = true
  ORDER BY income_from DESC
  LIMIT 1;
  
  RETURN COALESCE(tax_amount, 0);
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_cra_tax_tables_updated_at
  BEFORE UPDATE ON public.cra_tax_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_t4_box_mappings_updated_at
  BEFORE UPDATE ON public.t4_box_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roe_slips_updated_at
  BEFORE UPDATE ON public.roe_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cra_compliance_log_updated_at
  BEFORE UPDATE ON public.cra_compliance_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();