-- Create company_settings table for active tax year tracking
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  active_tax_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  cra_bn_rp TEXT,
  cra_wac TEXT,
  transmitter_name TEXT,
  transmitter_email TEXT,
  transmitter_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Create cra_year_packs table to track uploaded packs
CREATE TABLE IF NOT EXISTS public.cra_year_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  filename TEXT NOT NULL,
  pack_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create cra_rate_changes table to track rate comparisons
CREATE TABLE IF NOT EXISTS public.cra_rate_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_year INTEGER NOT NULL,
  to_year INTEGER NOT NULL,
  change_type TEXT NOT NULL,
  change_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cra_year_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cra_rate_changes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_settings
CREATE POLICY "Company members can view settings"
  ON public.company_settings FOR SELECT
  USING (get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage settings"
  ON public.company_settings FOR ALL
  USING (
    get_current_user_role() IN ('org_admin', 'payroll_admin')
    AND get_current_user_company() = company_id
  );

-- RLS Policies for cra_year_packs
CREATE POLICY "Company members can view year packs"
  ON public.cra_year_packs FOR SELECT
  USING (get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage year packs"
  ON public.cra_year_packs FOR ALL
  USING (
    get_current_user_role() IN ('org_admin', 'payroll_admin')
    AND get_current_user_company() = company_id
  );

-- RLS Policies for cra_rate_changes
CREATE POLICY "Company members can view rate changes"
  ON public.cra_rate_changes FOR SELECT
  USING (get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage rate changes"
  ON public.cra_rate_changes FOR ALL
  USING (
    get_current_user_role() IN ('org_admin', 'payroll_admin')
    AND get_current_user_company() = company_id
  );

-- Add trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cra_year_packs_updated_at
  BEFORE UPDATE ON public.cra_year_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_company_settings_company_id ON public.company_settings(company_id);
CREATE INDEX idx_cra_year_packs_company_year ON public.cra_year_packs(company_id, tax_year);
CREATE INDEX idx_cra_year_packs_active ON public.cra_year_packs(company_id, is_active) WHERE is_active = true;