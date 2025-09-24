-- Core payroll application database schema for Canadian multi-tenant payroll system

-- Company management
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  cra_business_number TEXT NOT NULL,
  remitter_type TEXT NOT NULL DEFAULT 'regular' CHECK (remitter_type IN ('regular', 'quarterly', 'small_employer')),
  default_pay_frequency TEXT NOT NULL DEFAULT 'biweekly' CHECK (default_pay_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  address JSONB NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Provinces and worksites
CREATE TABLE public.worksites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  province_code TEXT NOT NULL CHECK (province_code IN ('ON', 'BC')),
  address JSONB NOT NULL DEFAULT '{}',
  eht_settings JSONB NOT NULL DEFAULT '{}',
  wcb_settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unions
CREATE TABLE public.unions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  local_number TEXT,
  dues_type TEXT NOT NULL DEFAULT 'percentage' CHECK (dues_type IN ('fixed', 'percentage', 'percentage_base')),
  dues_rate DECIMAL(10,4),
  dues_cap DECIMAL(10,2),
  initiation_fee DECIMAL(10,2) DEFAULT 0,
  benefit_trust_rate DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Collective Bargaining Agreements
CREATE TABLE public.cbas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  union_id UUID NOT NULL REFERENCES public.unions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  effective_start DATE NOT NULL,
  effective_end DATE,
  overtime_rules JSONB NOT NULL DEFAULT '{}',
  stat_holiday_rules JSONB NOT NULL DEFAULT '{}',
  vacation_rules JSONB NOT NULL DEFAULT '{}',
  premium_rules JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CBA Wage Tables
CREATE TABLE public.cba_wage_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cba_id UUID NOT NULL REFERENCES public.cbas(id) ON DELETE CASCADE,
  classification TEXT NOT NULL,
  step INTEGER NOT NULL,
  hourly_rate DECIMAL(10,4) NOT NULL,
  effective_start DATE NOT NULL,
  effective_end DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cba_id, classification, step, effective_start)
);

-- Employees
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  worksite_id UUID NOT NULL REFERENCES public.worksites(id) ON DELETE RESTRICT,
  employee_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  sin_encrypted TEXT, -- Will be encrypted
  province_code TEXT NOT NULL CHECK (province_code IN ('ON', 'BC')),
  union_id UUID REFERENCES public.unions(id) ON DELETE SET NULL,
  cba_id UUID REFERENCES public.cbas(id) ON DELETE SET NULL,
  classification TEXT,
  step INTEGER,
  hire_date DATE NOT NULL,
  termination_date DATE,
  email TEXT,
  phone TEXT,
  address JSONB NOT NULL DEFAULT '{}',
  banking_info_encrypted TEXT, -- Will be encrypted
  td1_federal JSONB NOT NULL DEFAULT '{}',
  td1_provincial JSONB NOT NULL DEFAULT '{}',
  cpp_exempt BOOLEAN NOT NULL DEFAULT FALSE,
  ei_exempt BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'terminated', 'leave')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_number)
);

-- Earning Codes Catalog
CREATE TABLE public.earning_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  is_overtime BOOLEAN NOT NULL DEFAULT FALSE,
  overtime_multiplier DECIMAL(4,2) DEFAULT 1.0,
  is_taxable_federal BOOLEAN NOT NULL DEFAULT TRUE,
  is_taxable_provincial BOOLEAN NOT NULL DEFAULT TRUE,
  is_cpp_pensionable BOOLEAN NOT NULL DEFAULT TRUE,
  is_ei_insurable BOOLEAN NOT NULL DEFAULT TRUE,
  is_vacation_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Deduction Codes Catalog
CREATE TABLE public.deduction_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  calc_type TEXT NOT NULL DEFAULT 'fixed' CHECK (calc_type IN ('fixed', 'percentage', 'percentage_gross')),
  rate DECIMAL(10,4),
  cap DECIMAL(10,2),
  is_taxable_reduction BOOLEAN NOT NULL DEFAULT FALSE,
  is_cpp_reduction BOOLEAN NOT NULL DEFAULT FALSE,
  is_ei_reduction BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Pay Calendars
CREATE TABLE public.pay_calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'processed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Timesheets
CREATE TABLE public.timesheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  pay_calendar_id UUID NOT NULL REFERENCES public.pay_calendars(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours_regular DECIMAL(5,2) NOT NULL DEFAULT 0,
  hours_ot1 DECIMAL(5,2) NOT NULL DEFAULT 0,
  hours_ot2 DECIMAL(5,2) NOT NULL DEFAULT 0,
  hours_stat DECIMAL(5,2) NOT NULL DEFAULT 0,
  project_code TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'locked')),
  approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, work_date)
);

-- Pay Runs
CREATE TABLE public.pay_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pay_calendar_id UUID NOT NULL REFERENCES public.pay_calendars(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL DEFAULT 'regular' CHECK (run_type IN ('regular', 'off_cycle', 'correction', 'bonus')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'calculating', 'preview', 'finalized', 'reversed')),
  total_gross_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_net_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_taxes DECIMAL(12,2) NOT NULL DEFAULT 0,
  employee_count INTEGER NOT NULL DEFAULT 0,
  processed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pay Run Lines (individual employee calculations)
CREATE TABLE public.pay_run_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pay_run_id UUID NOT NULL REFERENCES public.pay_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  earnings JSONB NOT NULL DEFAULT '{}',
  deductions JSONB NOT NULL DEFAULT '{}',
  taxes JSONB NOT NULL DEFAULT '{}',
  employer_costs JSONB NOT NULL DEFAULT '{}',
  gross_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
  taxable_income DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
  ytd_totals JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pay_run_id, employee_id)
);

-- Rules Engine Tables for statutory rates and calculations
CREATE TABLE public.tax_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jurisdiction TEXT NOT NULL CHECK (jurisdiction IN ('federal', 'ON', 'BC')),
  tax_year INTEGER NOT NULL,
  effective_start DATE NOT NULL,
  effective_end DATE,
  brackets JSONB NOT NULL DEFAULT '[]',
  basic_exemption DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplemental_rate DECIMAL(5,4),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(jurisdiction, tax_year, effective_start)
);

-- CPP/EI Rules
CREATE TABLE public.cpp_ei_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tax_year INTEGER NOT NULL,
  effective_start DATE NOT NULL,
  effective_end DATE,
  cpp_basic_exemption DECIMAL(10,2) NOT NULL,
  cpp_max_pensionable DECIMAL(10,2) NOT NULL,
  cpp_rate_employee DECIMAL(5,4) NOT NULL,
  cpp_rate_employer DECIMAL(5,4) NOT NULL,
  ei_max_insurable DECIMAL(10,2) NOT NULL,
  ei_rate_employee DECIMAL(5,4) NOT NULL,
  ei_rate_employer DECIMAL(5,4) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tax_year, effective_start)
);

-- EHT (Employer Health Tax) Rules by Province
CREATE TABLE public.eht_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  province_code TEXT NOT NULL CHECK (province_code IN ('ON', 'BC')),
  tax_year INTEGER NOT NULL,
  effective_start DATE NOT NULL,
  effective_end DATE,
  threshold DECIMAL(12,2) NOT NULL,
  rate DECIMAL(5,4) NOT NULL,
  is_charity_exempt BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(province_code, tax_year, effective_start)
);

-- Workers Compensation Rules
CREATE TABLE public.wcb_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  province_code TEXT NOT NULL CHECK (province_code IN ('ON', 'BC')),
  class_code TEXT NOT NULL,
  description TEXT NOT NULL,
  base_rate DECIMAL(6,4) NOT NULL,
  max_assessable DECIMAL(12,2),
  effective_start DATE NOT NULL,
  effective_end DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(province_code, class_code, effective_start)
);

-- Statutory Holidays by Province
CREATE TABLE public.statutory_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  province_code TEXT NOT NULL CHECK (province_code IN ('ON', 'BC')),
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  is_observed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(province_code, holiday_date)
);

-- GL Mappings
CREATE TABLE public.gl_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code_type TEXT NOT NULL CHECK (code_type IN ('earning', 'deduction', 'tax', 'employer_cost')),
  code_id UUID NOT NULL,
  account_number TEXT NOT NULL,
  department_code TEXT,
  cost_center TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, code_type, code_id)
);

-- Documents and File Storage
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('pay_stub', 't4', 't4a', 'roe', 'gl_export', 'remittance', 'cpa005')),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  pay_run_id UUID REFERENCES public.pay_runs(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit Logs
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID, -- Can be null for system actions
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  before_data JSONB,
  after_data JSONB,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cba_wage_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earning_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deduction_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_run_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpp_ei_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eht_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wcb_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statutory_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gl_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_employees_company_id ON public.employees(company_id);
CREATE INDEX idx_employees_worksite_id ON public.employees(worksite_id);
CREATE INDEX idx_employees_employee_number ON public.employees(company_id, employee_number);
CREATE INDEX idx_timesheets_employee_date ON public.timesheets(employee_id, work_date);
CREATE INDEX idx_timesheets_calendar ON public.timesheets(pay_calendar_id);
CREATE INDEX idx_pay_run_lines_payrun ON public.pay_run_lines(pay_run_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_worksites_updated_at BEFORE UPDATE ON public.worksites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_unions_updated_at BEFORE UPDATE ON public.unions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cbas_updated_at BEFORE UPDATE ON public.cbas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cba_wage_tables_updated_at BEFORE UPDATE ON public.cba_wage_tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_earning_codes_updated_at BEFORE UPDATE ON public.earning_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deduction_codes_updated_at BEFORE UPDATE ON public.deduction_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pay_calendars_updated_at BEFORE UPDATE ON public.pay_calendars FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON public.timesheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pay_runs_updated_at BEFORE UPDATE ON public.pay_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pay_run_lines_updated_at BEFORE UPDATE ON public.pay_run_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tax_rules_updated_at BEFORE UPDATE ON public.tax_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cpp_ei_rules_updated_at BEFORE UPDATE ON public.cpp_ei_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_eht_rules_updated_at BEFORE UPDATE ON public.eht_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wcb_rules_updated_at BEFORE UPDATE ON public.wcb_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gl_mappings_updated_at BEFORE UPDATE ON public.gl_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();