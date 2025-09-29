-- Add missing columns to existing deduction_codes table
ALTER TABLE public.deduction_codes 
ADD COLUMN IF NOT EXISTS label TEXT,
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('Tax', 'Benefit', 'Retirement', 'Union', 'Other')),
ADD COLUMN IF NOT EXISTS is_employer_contribution BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS maps_to TEXT,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Update existing description column to label if label doesn't exist
UPDATE public.deduction_codes SET label = description WHERE label IS NULL;

-- Create CostCenter table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cost_centers (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT,
  location_province TEXT CHECK (location_province IN ('AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')),
  active BOOLEAN NOT NULL DEFAULT true,
  company_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for employee deduction codes if it doesn't exist
CREATE TABLE IF NOT EXISTS public.employee_deduction_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  deduction_code TEXT NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, deduction_code, effective_from)
);

-- Add new fields to employees table if they don't exist
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS cost_center_code TEXT,
ADD COLUMN IF NOT EXISTS union_type TEXT CHECK (union_type IN ('UNIFOR', 'PSAC', 'NonUnion')),
ADD COLUMN IF NOT EXISTS employee_group TEXT;

-- Enable RLS for new tables if not already enabled
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cost_centers') THEN
    ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_deduction_codes') THEN
    ALTER TABLE public.employee_deduction_codes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- RLS policies for cost_centers (only create if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cost_centers' AND policyname = 'Company members can view cost centers') THEN
    CREATE POLICY "Company members can view cost centers" 
    ON public.cost_centers 
    FOR SELECT 
    USING (get_current_user_company() = company_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cost_centers' AND policyname = 'Payroll admins can manage cost centers') THEN
    CREATE POLICY "Payroll admins can manage cost centers" 
    ON public.cost_centers 
    FOR ALL 
    USING (get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text]) AND get_current_user_company() = company_id);
  END IF;
END $$;

-- RLS policies for employee_deduction_codes
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_deduction_codes' AND policyname = 'Company members can view employee deduction codes') THEN
    CREATE POLICY "Company members can view employee deduction codes" 
    ON public.employee_deduction_codes 
    FOR SELECT 
    USING (EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.id = employee_deduction_codes.employee_id 
      AND get_current_user_company() = e.company_id
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_deduction_codes' AND policyname = 'Payroll admins can manage employee deduction codes') THEN
    CREATE POLICY "Payroll admins can manage employee deduction codes" 
    ON public.employee_deduction_codes 
    FOR ALL 
    USING (get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text]) AND EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.id = employee_deduction_codes.employee_id 
      AND get_current_user_company() = e.company_id
    ));
  END IF;
END $$;

-- Create triggers for updated_at if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_cost_centers_updated_at') THEN
    CREATE TRIGGER update_cost_centers_updated_at
      BEFORE UPDATE ON public.cost_centers
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_employee_deduction_codes_updated_at') THEN
    CREATE TRIGGER update_employee_deduction_codes_updated_at
      BEFORE UPDATE ON public.employee_deduction_codes
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Function to apply special deduction code rules
CREATE OR REPLACE FUNCTION public.apply_deduction_code_rules()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle 72S code: set union to UNIFOR
  IF NEW.deduction_code = '72S' THEN
    UPDATE employees 
    SET union_type = 'UNIFOR'
    WHERE id = NEW.employee_id;
  END IF;
  
  -- Handle OZC code: set group to Kitsault and province to BC
  IF NEW.deduction_code = 'OZC' THEN
    UPDATE employees 
    SET employee_group = 'Kitsault',
        province_code = 'BC'
    WHERE id = NEW.employee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for applying deduction code rules if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'apply_deduction_rules') THEN
    CREATE TRIGGER apply_deduction_rules
      AFTER INSERT ON public.employee_deduction_codes
      FOR EACH ROW
      EXECUTE FUNCTION public.apply_deduction_code_rules();
  END IF;
END $$;