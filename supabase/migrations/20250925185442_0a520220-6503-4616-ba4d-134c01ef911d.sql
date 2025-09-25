-- Fix infinite recursion in profiles RLS policies by using security definer functions
-- and implement comprehensive security policies

-- Drop existing problematic policies first
DROP POLICY IF EXISTS "Company admins can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_current_user_company()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_current_user_employee_id()
RETURNS UUID AS $$
  SELECT employee_id FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create new secure policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Company admins can view company profiles" 
ON public.profiles 
FOR SELECT 
USING (
  public.get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND public.get_current_user_company() = company_id
);

-- Add 2FA enforcement for admin roles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS backup_codes TEXT[];

-- Add security columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_2fa_verification TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE;

-- RLS policies for all missing tables

-- CBAs table
CREATE POLICY "Company members can view CBAs" 
ON public.cbas 
FOR SELECT 
USING (public.get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage CBAs" 
ON public.cbas 
FOR ALL 
USING (
  public.get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND public.get_current_user_company() = company_id
);

-- CBA wage tables
CREATE POLICY "Company members can view CBA wage tables" 
ON public.cba_wage_tables 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.cbas c 
  WHERE c.id = cba_wage_tables.cba_id 
  AND public.get_current_user_company() = c.company_id
));

CREATE POLICY "Payroll admins can manage CBA wage tables" 
ON public.cba_wage_tables 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.cbas c 
  WHERE c.id = cba_wage_tables.cba_id 
  AND public.get_current_user_role() IN ('org_admin', 'payroll_admin')
  AND public.get_current_user_company() = c.company_id
));

-- CPP/EI rules (public data)
CREATE POLICY "All authenticated users can view CPP/EI rules" 
ON public.cpp_ei_rules 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Only org admins can manage CPP/EI rules" 
ON public.cpp_ei_rules 
FOR ALL 
USING (public.get_current_user_role() = 'org_admin');

-- Deduction codes
CREATE POLICY "Company members can view deduction codes" 
ON public.deduction_codes 
FOR SELECT 
USING (public.get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage deduction codes" 
ON public.deduction_codes 
FOR ALL 
USING (
  public.get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND public.get_current_user_company() = company_id
);

-- Documents - strict employee-only access
CREATE POLICY "Employees can view their own documents" 
ON public.documents 
FOR SELECT 
USING (
  employee_id = public.get_current_user_employee_id()
  OR (
    public.get_current_user_role() IN ('org_admin', 'payroll_admin') 
    AND public.get_current_user_company() = company_id
  )
);

CREATE POLICY "Payroll admins can manage documents" 
ON public.documents 
FOR ALL 
USING (
  public.get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND public.get_current_user_company() = company_id
);

-- Earning codes
CREATE POLICY "Company members can view earning codes" 
ON public.earning_codes 
FOR SELECT 
USING (public.get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage earning codes" 
ON public.earning_codes 
FOR ALL 
USING (
  public.get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND public.get_current_user_company() = company_id
);

-- EHT rules (public data by province)
CREATE POLICY "All authenticated users can view EHT rules" 
ON public.eht_rules 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Only org admins can manage EHT rules" 
ON public.eht_rules 
FOR ALL 
USING (public.get_current_user_role() = 'org_admin');

-- GL mappings
CREATE POLICY "Company members can view GL mappings" 
ON public.gl_mappings 
FOR SELECT 
USING (public.get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage GL mappings" 
ON public.gl_mappings 
FOR ALL 
USING (
  public.get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND public.get_current_user_company() = company_id
);

-- Pay calendars
CREATE POLICY "Company members can view pay calendars" 
ON public.pay_calendars 
FOR SELECT 
USING (public.get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage pay calendars" 
ON public.pay_calendars 
FOR ALL 
USING (
  public.get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND public.get_current_user_company() = company_id
);

-- Pay runs - highly restricted
CREATE POLICY "Payroll admins can view pay runs" 
ON public.pay_runs 
FOR SELECT 
USING (
  public.get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND public.get_current_user_company() = company_id
);

CREATE POLICY "Payroll admins can manage pay runs" 
ON public.pay_runs 
FOR ALL 
USING (
  public.get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND public.get_current_user_company() = company_id
);

-- Pay run lines - employees can only see their own
CREATE POLICY "Employees can view their own pay run lines" 
ON public.pay_run_lines 
FOR SELECT 
USING (
  employee_id = public.get_current_user_employee_id()
  OR (
    public.get_current_user_role() IN ('org_admin', 'payroll_admin') 
    AND EXISTS (
      SELECT 1 FROM public.pay_runs pr 
      WHERE pr.id = pay_run_lines.pay_run_id 
      AND public.get_current_user_company() = pr.company_id
    )
  )
);

CREATE POLICY "Payroll admins can manage pay run lines" 
ON public.pay_run_lines 
FOR ALL 
USING (
  public.get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND EXISTS (
    SELECT 1 FROM public.pay_runs pr 
    WHERE pr.id = pay_run_lines.pay_run_id 
    AND public.get_current_user_company() = pr.company_id
  )
);

-- Statutory holidays (public data)
CREATE POLICY "All authenticated users can view statutory holidays" 
ON public.statutory_holidays 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Only org admins can manage statutory holidays" 
ON public.statutory_holidays 
FOR ALL 
USING (public.get_current_user_role() = 'org_admin');

-- Tax rules (public data)
CREATE POLICY "All authenticated users can view tax rules" 
ON public.tax_rules 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Only org admins can manage tax rules" 
ON public.tax_rules 
FOR ALL 
USING (public.get_current_user_role() = 'org_admin');

-- Unions
CREATE POLICY "Company members can view unions" 
ON public.unions 
FOR SELECT 
USING (public.get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage unions" 
ON public.unions 
FOR ALL 
USING (
  public.get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND public.get_current_user_company() = company_id
);

-- WCB rules (public data by province)
CREATE POLICY "All authenticated users can view WCB rules" 
ON public.wcb_rules 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Only org admins can manage WCB rules" 
ON public.wcb_rules 
FOR ALL 
USING (public.get_current_user_role() = 'org_admin');

-- Function to enforce 2FA for admin operations
CREATE OR REPLACE FUNCTION public.require_2fa_for_admin_action()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  two_fa_enabled BOOLEAN;
  last_verification TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT role, two_factor_enabled, last_2fa_verification 
  INTO user_role, two_fa_enabled, last_verification
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- If user is admin and 2FA is not enabled, deny access
  IF user_role IN ('org_admin', 'payroll_admin') THEN
    IF NOT two_fa_enabled THEN
      RAISE EXCEPTION 'Two-factor authentication required for admin operations';
    END IF;
    
    -- Require 2FA verification within last 30 minutes for sensitive operations
    IF last_verification IS NULL OR last_verification < NOW() - INTERVAL '30 minutes' THEN
      RAISE EXCEPTION 'Recent two-factor authentication verification required';
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enhanced audit function for sensitive operations
CREATE OR REPLACE FUNCTION public.log_sensitive_action(
  action_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  sensitive_fields JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  -- Check 2FA requirement for admin actions
  IF action_type IN ('UPDATE_BANKING', 'UPDATE_SIN', 'PROCESS_PAYROLL', 'EXPORT_DATA') THEN
    PERFORM public.require_2fa_for_admin_action();
  END IF;
  
  INSERT INTO public.audit_logs (
    action,
    entity_type,
    entity_id,
    metadata,
    actor_id
  ) VALUES (
    action_type,
    entity_type,
    entity_id,
    jsonb_build_object(
      'ip_address', current_setting('request.headers')::json->>'x-forwarded-for',
      'user_agent', current_setting('request.headers')::json->>'user-agent',
      'sensitive_fields', sensitive_fields,
      'timestamp', NOW()
    ),
    auth.uid()
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;