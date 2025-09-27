-- Enhance existing tables and add new ones for comprehensive CRA integration

-- Add CRA submissions tracking table
CREATE TABLE public.cra_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  submission_type TEXT NOT NULL, -- 't4', 't4a', 'roe', 'remittance', 'pd7a'
  tax_year INTEGER NOT NULL,
  employee_count INTEGER DEFAULT 0,
  file_url TEXT,
  xml_url TEXT,
  pdf_url TEXT,
  csv_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'generated', 'transmitted', 'confirmed', 'failed'
  confirmation_number TEXT,
  cra_reference_number TEXT,
  details_json JSONB NOT NULL DEFAULT '{}',
  errors_json JSONB NOT NULL DEFAULT '[]',
  transmitted_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhance T4 slips table with additional fields
ALTER TABLE public.t4_slips ADD COLUMN IF NOT EXISTS xml_url TEXT;
ALTER TABLE public.t4_slips ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE public.t4_slips ADD COLUMN IF NOT EXISTS errors_json JSONB DEFAULT '[]';
ALTER TABLE public.t4_slips ADD COLUMN IF NOT EXISTS is_amended BOOLEAN DEFAULT false;
ALTER TABLE public.t4_slips ADD COLUMN IF NOT EXISTS original_slip_id UUID REFERENCES public.t4_slips(id);

-- Create paycode mapping table with versioning
CREATE TABLE public.paycode_cra_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  company_code TEXT NOT NULL, -- '72R', '72S', 'OZC'
  pay_code TEXT NOT NULL,
  deduction_code TEXT,
  cra_box TEXT NOT NULL,
  box_description TEXT NOT NULL,
  mapping_type TEXT NOT NULL, -- 'earning', 'deduction', 'tax'
  is_cpp_pensionable BOOLEAN DEFAULT true,
  is_ei_insurable BOOLEAN DEFAULT true,
  is_taxable_federal BOOLEAN DEFAULT true,
  is_taxable_provincial BOOLEAN DEFAULT true,
  is_vacation_eligible BOOLEAN DEFAULT true,
  flags_json JSONB NOT NULL DEFAULT '{}',
  gl_account TEXT,
  cost_center TEXT,
  department_code TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create remittance periods table
CREATE TABLE public.remittance_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  period_type TEXT NOT NULL, -- 'monthly', 'quarterly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  total_income_tax NUMERIC NOT NULL DEFAULT 0,
  total_cpp_employee NUMERIC NOT NULL DEFAULT 0,
  total_cpp_employer NUMERIC NOT NULL DEFAULT 0,
  total_ei_employee NUMERIC NOT NULL DEFAULT 0,
  total_ei_employer NUMERIC NOT NULL DEFAULT 0,
  total_remittance NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'calculated', 'paid', 'filed'
  paid_date DATE,
  filed_date DATE,
  pd7a_url TEXT,
  eft_file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee year-end summary table
CREATE TABLE public.employee_year_end_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  tax_year INTEGER NOT NULL,
  total_employment_income NUMERIC NOT NULL DEFAULT 0,
  total_cpp_pensionable NUMERIC NOT NULL DEFAULT 0,
  total_ei_insurable NUMERIC NOT NULL DEFAULT 0,
  total_cpp_contributions NUMERIC NOT NULL DEFAULT 0,
  total_ei_premiums NUMERIC NOT NULL DEFAULT 0,
  total_income_tax NUMERIC NOT NULL DEFAULT 0,
  total_rpp_contributions NUMERIC NOT NULL DEFAULT 0,
  total_union_dues NUMERIC NOT NULL DEFAULT 0,
  other_income JSONB NOT NULL DEFAULT '{}',
  other_deductions JSONB NOT NULL DEFAULT '{}',
  is_finalized BOOLEAN NOT NULL DEFAULT false,
  finalized_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, tax_year)
);

-- Add indexes for performance
CREATE INDEX idx_cra_submissions_company_year ON public.cra_submissions(company_id, tax_year);
CREATE INDEX idx_cra_submissions_type_status ON public.cra_submissions(submission_type, status);
CREATE INDEX idx_paycode_mapping_company_code ON public.paycode_cra_mapping(company_id, company_code);
CREATE INDEX idx_paycode_mapping_effective ON public.paycode_cra_mapping(effective_from, effective_to);
CREATE INDEX idx_remittance_periods_company ON public.remittance_periods(company_id, period_start);
CREATE INDEX idx_employee_year_end_tax_year ON public.employee_year_end_summary(tax_year);

-- Enable RLS on new tables
ALTER TABLE public.cra_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paycode_cra_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remittance_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_year_end_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for CRA submissions
CREATE POLICY "Company members can view CRA submissions" 
ON public.cra_submissions 
FOR SELECT 
USING (get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage CRA submissions" 
ON public.cra_submissions 
FOR ALL 
USING (get_current_user_role() IN ('org_admin', 'payroll_admin') AND get_current_user_company() = company_id);

-- RLS Policies for paycode mapping
CREATE POLICY "Company members can view paycode mapping" 
ON public.paycode_cra_mapping 
FOR SELECT 
USING (get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage paycode mapping" 
ON public.paycode_cra_mapping 
FOR ALL 
USING (get_current_user_role() IN ('org_admin', 'payroll_admin') AND get_current_user_company() = company_id);

-- RLS Policies for remittance periods
CREATE POLICY "Company members can view remittance periods" 
ON public.remittance_periods 
FOR SELECT 
USING (get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage remittance periods" 
ON public.remittance_periods 
FOR ALL 
USING (get_current_user_role() IN ('org_admin', 'payroll_admin') AND get_current_user_company() = company_id);

-- RLS Policies for employee year-end summary
CREATE POLICY "Employees can view their year-end summary" 
ON public.employee_year_end_summary 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM employees e 
  WHERE e.id = employee_year_end_summary.employee_id 
  AND (e.id = get_current_user_employee_id() OR get_current_user_company() = e.company_id)
));

CREATE POLICY "Payroll admins can manage year-end summaries" 
ON public.employee_year_end_summary 
FOR ALL 
USING (get_current_user_role() IN ('org_admin', 'payroll_admin') AND EXISTS (
  SELECT 1 FROM employees e 
  WHERE e.id = employee_year_end_summary.employee_id 
  AND get_current_user_company() = e.company_id
));

-- Create function to calculate remittance period totals
CREATE OR REPLACE FUNCTION public.calculate_remittance_period_totals(
  p_company_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  total_income_tax NUMERIC := 0;
  total_cpp_employee NUMERIC := 0;
  total_cpp_employer NUMERIC := 0;
  total_ei_employee NUMERIC := 0;
  total_ei_employer NUMERIC := 0;
BEGIN
  -- Calculate totals from pay run lines in the period
  SELECT 
    COALESCE(SUM((taxes->>'federal_tax')::numeric), 0) + COALESCE(SUM((taxes->>'provincial_tax')::numeric), 0),
    COALESCE(SUM((taxes->>'cpp_employee')::numeric), 0),
    COALESCE(SUM((taxes->>'cpp_employer')::numeric), 0),
    COALESCE(SUM((taxes->>'ei_employee')::numeric), 0),
    COALESCE(SUM((taxes->>'ei_employer')::numeric), 0)
  INTO 
    total_income_tax,
    total_cpp_employee,
    total_cpp_employer,
    total_ei_employee,
    total_ei_employer
  FROM pay_run_lines prl
  JOIN pay_runs pr ON pr.id = prl.pay_run_id
  JOIN pay_calendars pc ON pc.id = pr.pay_calendar_id
  WHERE pr.company_id = p_company_id
    AND pc.period_start >= p_period_start
    AND pc.period_end <= p_period_end
    AND pr.status IN ('processed', 'approved');
  
  result := jsonb_build_object(
    'total_income_tax', total_income_tax,
    'total_cpp_employee', total_cpp_employee,
    'total_cpp_employer', total_cpp_employer,
    'total_ei_employee', total_ei_employee,
    'total_ei_employer', total_ei_employer,
    'total_remittance', total_income_tax + total_cpp_employee + total_cpp_employer + total_ei_employee + total_ei_employer
  );
  
  RETURN result;
END;
$$;

-- Create function to build employee year-end summary
CREATE OR REPLACE FUNCTION public.build_employee_year_end_summary(
  p_employee_id UUID,
  p_tax_year INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  summary_id UUID;
  total_employment_income NUMERIC := 0;
  total_cpp_pensionable NUMERIC := 0;
  total_ei_insurable NUMERIC := 0;
  total_cpp_contributions NUMERIC := 0;
  total_ei_premiums NUMERIC := 0;
  total_income_tax NUMERIC := 0;
  total_rpp_contributions NUMERIC := 0;
  total_union_dues NUMERIC := 0;
BEGIN
  -- Calculate YTD totals from pay run lines
  SELECT 
    COALESCE(SUM(gross_pay), 0),
    COALESCE(SUM((ytd_totals->>'cpp_pensionable')::numeric), 0),
    COALESCE(SUM((ytd_totals->>'ei_insurable')::numeric), 0),
    COALESCE(SUM((taxes->>'cpp_employee')::numeric), 0),
    COALESCE(SUM((taxes->>'ei_employee')::numeric), 0),
    COALESCE(SUM((taxes->>'federal_tax')::numeric), 0) + COALESCE(SUM((taxes->>'provincial_tax')::numeric), 0),
    COALESCE(SUM((deductions->>'rpp')::numeric), 0),
    COALESCE(SUM((deductions->>'union_dues')::numeric), 0)
  INTO 
    total_employment_income,
    total_cpp_pensionable,
    total_ei_insurable,
    total_cpp_contributions,
    total_ei_premiums,
    total_income_tax,
    total_rpp_contributions,
    total_union_dues
  FROM pay_run_lines prl
  JOIN pay_runs pr ON pr.id = prl.pay_run_id
  JOIN pay_calendars pc ON pc.id = pr.pay_calendar_id
  WHERE prl.employee_id = p_employee_id
    AND EXTRACT(YEAR FROM pc.period_end) = p_tax_year
    AND pr.status IN ('processed', 'approved');

  -- Upsert year-end summary
  INSERT INTO employee_year_end_summary (
    employee_id,
    tax_year,
    total_employment_income,
    total_cpp_pensionable,
    total_ei_insurable,
    total_cpp_contributions,
    total_ei_premiums,
    total_income_tax,
    total_rpp_contributions,
    total_union_dues
  ) VALUES (
    p_employee_id,
    p_tax_year,
    total_employment_income,
    total_cpp_pensionable,
    total_ei_insurable,
    total_cpp_contributions,
    total_ei_premiums,
    total_income_tax,
    total_rpp_contributions,
    total_union_dues
  )
  ON CONFLICT (employee_id, tax_year)
  DO UPDATE SET
    total_employment_income = EXCLUDED.total_employment_income,
    total_cpp_pensionable = EXCLUDED.total_cpp_pensionable,
    total_ei_insurable = EXCLUDED.total_ei_insurable,
    total_cpp_contributions = EXCLUDED.total_cpp_contributions,
    total_ei_premiums = EXCLUDED.total_ei_premiums,
    total_income_tax = EXCLUDED.total_income_tax,
    total_rpp_contributions = EXCLUDED.total_rpp_contributions,
    total_union_dues = EXCLUDED.total_union_dues,
    updated_at = now()
  RETURNING id INTO summary_id;

  RETURN summary_id;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_cra_submissions_updated_at
  BEFORE UPDATE ON public.cra_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_paycode_cra_mapping_updated_at
  BEFORE UPDATE ON public.paycode_cra_mapping
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_remittance_periods_updated_at
  BEFORE UPDATE ON public.remittance_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_year_end_summary_updated_at
  BEFORE UPDATE ON public.employee_year_end_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();