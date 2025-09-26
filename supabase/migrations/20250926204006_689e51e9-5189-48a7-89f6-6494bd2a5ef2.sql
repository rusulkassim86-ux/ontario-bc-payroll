-- Create tables for CRA reporting and T4/T4A slips

-- CRA Remittance Reports table
CREATE TABLE public.cra_remittance_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('monthly', 'quarterly')),
  total_cpp_employee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cpp_employer NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_ei_employee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_ei_employer NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_federal_tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_provincial_tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_remittance_due NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'submitted')),
  generated_by UUID,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- T4 Slips table
CREATE TABLE public.t4_slips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  tax_year INTEGER NOT NULL,
  box_14_employment_income NUMERIC(10,2) NOT NULL DEFAULT 0,
  box_16_cpp_contributions NUMERIC(10,2) NOT NULL DEFAULT 0,
  box_17_cpp_pensionable_earnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  box_18_ei_premiums NUMERIC(10,2) NOT NULL DEFAULT 0,
  box_19_ei_insurable_earnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  box_22_income_tax_deducted NUMERIC(10,2) NOT NULL DEFAULT 0,
  box_24_ei_insurable_earnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  box_26_cpp_pensionable_earnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  box_44_union_dues NUMERIC(10,2) NOT NULL DEFAULT 0,
  box_46_charitable_donations NUMERIC(10,2) NOT NULL DEFAULT 0,
  box_50_rpps NUMERIC(10,2) NOT NULL DEFAULT 0,
  other_boxes JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'issued', 'amended')),
  original_slip_id UUID, -- For amendments
  amendment_reason TEXT,
  generated_by UUID,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  issued_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_id, tax_year, status) -- Prevent duplicate active slips
);

-- T4A Slips table
CREATE TABLE public.t4a_slips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_sin TEXT,
  recipient_address JSONB NOT NULL DEFAULT '{}',
  tax_year INTEGER NOT NULL,
  box_20_self_employed_commissions NUMERIC(10,2) NOT NULL DEFAULT 0,
  box_22_income_tax_deducted NUMERIC(10,2) NOT NULL DEFAULT 0,
  box_48_fees_services NUMERIC(10,2) NOT NULL DEFAULT 0,
  other_boxes JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'issued', 'amended')),
  original_slip_id UUID, -- For amendments
  amendment_reason TEXT,
  generated_by UUID,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  issued_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CRA Filing Records table
CREATE TABLE public.cra_filing_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  filing_type TEXT NOT NULL CHECK (filing_type IN ('remittance', 't4_summary', 't4a_summary', 't619')),
  tax_year INTEGER,
  period_start DATE,
  period_end DATE,
  file_path TEXT,
  file_format TEXT NOT NULL CHECK (file_format IN ('xml', 'pdf', 'csv', 'excel')),
  submission_status TEXT NOT NULL DEFAULT 'generated' CHECK (submission_status IN ('generated', 'submitted', 'accepted', 'rejected')),
  cra_confirmation_number TEXT,
  filed_by UUID,
  filed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cra_remittance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t4_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t4a_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cra_filing_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for CRA Remittance Reports
CREATE POLICY "Company members can view CRA remittance reports" 
ON public.cra_remittance_reports 
FOR SELECT 
USING (get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage CRA remittance reports" 
ON public.cra_remittance_reports 
FOR ALL 
USING ((get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text])) AND (get_current_user_company() = company_id));

-- RLS Policies for T4 Slips
CREATE POLICY "Employees can view their own T4 slips" 
ON public.t4_slips 
FOR SELECT 
USING ((employee_id = get_current_user_employee_id()) OR ((get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text])) AND (get_current_user_company() = company_id)));

CREATE POLICY "Payroll admins can manage T4 slips" 
ON public.t4_slips 
FOR ALL 
USING ((get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text])) AND (get_current_user_company() = company_id));

-- RLS Policies for T4A Slips
CREATE POLICY "Company admins can manage T4A slips" 
ON public.t4a_slips 
FOR ALL 
USING ((get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text])) AND (get_current_user_company() = company_id));

-- RLS Policies for CRA Filing Records
CREATE POLICY "Company members can view CRA filing records" 
ON public.cra_filing_records 
FOR SELECT 
USING (get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage CRA filing records" 
ON public.cra_filing_records 
FOR ALL 
USING ((get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text])) AND (get_current_user_company() = company_id));

-- Triggers for updated_at
CREATE TRIGGER update_cra_remittance_reports_updated_at
BEFORE UPDATE ON public.cra_remittance_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_t4_slips_updated_at
BEFORE UPDATE ON public.t4_slips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_t4a_slips_updated_at
BEFORE UPDATE ON public.t4a_slips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cra_filing_records_updated_at
BEFORE UPDATE ON public.cra_filing_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate CRA remittance report
CREATE OR REPLACE FUNCTION public.generate_cra_remittance_report(
  p_company_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_report_type TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_id UUID;
  cpp_employee_total NUMERIC := 0;
  cpp_employer_total NUMERIC := 0;
  ei_employee_total NUMERIC := 0;
  ei_employer_total NUMERIC := 0;
  federal_tax_total NUMERIC := 0;
  provincial_tax_total NUMERIC := 0;
  remittance_due NUMERIC := 0;
  due_date DATE;
BEGIN
  -- Check permissions
  IF get_current_user_role() NOT IN ('org_admin', 'payroll_admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to generate CRA reports';
  END IF;
  
  IF get_current_user_company() != p_company_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Calculate totals from pay runs in the period
  SELECT 
    COALESCE(SUM((taxes->>'cpp_employee')::numeric), 0),
    COALESCE(SUM((taxes->>'cpp_employer')::numeric), 0),
    COALESCE(SUM((taxes->>'ei_employee')::numeric), 0),
    COALESCE(SUM((taxes->>'ei_employer')::numeric), 0),
    COALESCE(SUM((taxes->>'federal_tax')::numeric), 0),
    COALESCE(SUM((taxes->>'provincial_tax')::numeric), 0)
  INTO 
    cpp_employee_total,
    cpp_employer_total,
    ei_employee_total,
    ei_employer_total,
    federal_tax_total,
    provincial_tax_total
  FROM pay_run_lines prl
  JOIN pay_runs pr ON pr.id = prl.pay_run_id
  JOIN pay_calendars pc ON pc.id = pr.pay_calendar_id
  WHERE pr.company_id = p_company_id
    AND pc.period_start >= p_period_start
    AND pc.period_end <= p_period_end
    AND pr.status = 'processed';
  
  -- Calculate total remittance due
  remittance_due := cpp_employee_total + cpp_employer_total + ei_employee_total + ei_employer_total + federal_tax_total + provincial_tax_total;
  
  -- Calculate due date (15th of following month for monthly, quarterly varies)
  IF p_report_type = 'monthly' THEN
    due_date := DATE_TRUNC('month', p_period_end) + INTERVAL '1 month 15 days' - INTERVAL '1 day';
  ELSE
    due_date := DATE_TRUNC('quarter', p_period_end) + INTERVAL '3 months 15 days' - INTERVAL '1 day';
  END IF;
  
  -- Insert report record
  INSERT INTO cra_remittance_reports (
    company_id,
    report_period_start,
    report_period_end,
    report_type,
    total_cpp_employee,
    total_cpp_employer,
    total_ei_employee,
    total_ei_employer,
    total_federal_tax,
    total_provincial_tax,
    total_remittance_due,
    due_date,
    generated_by
  ) VALUES (
    p_company_id,
    p_period_start,
    p_period_end,
    p_report_type,
    cpp_employee_total,
    cpp_employer_total,
    ei_employee_total,
    ei_employer_total,
    federal_tax_total,
    provincial_tax_total,
    remittance_due,
    due_date,
    auth.uid()
  ) RETURNING id INTO report_id;
  
  -- Create audit log
  PERFORM create_audit_log(
    'GENERATE_CRA_REMITTANCE',
    'cra_remittance_report',
    report_id,
    NULL,
    jsonb_build_object(
      'period_start', p_period_start,
      'period_end', p_period_end,
      'report_type', p_report_type,
      'total_remittance_due', remittance_due
    )
  );
  
  RETURN report_id;
END;
$$;