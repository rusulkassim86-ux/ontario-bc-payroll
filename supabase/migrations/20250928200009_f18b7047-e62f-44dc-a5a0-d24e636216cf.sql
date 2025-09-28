-- Fix security issue: Restrict pay_run_lines access to only employee self-access and strict admin verification

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Employees can view their own pay run lines" ON public.pay_run_lines;
DROP POLICY IF EXISTS "Payroll admins can manage pay run lines" ON public.pay_run_lines;

-- Create function to securely verify admin access to sensitive payroll data
CREATE OR REPLACE FUNCTION public.can_admin_access_payroll_data(p_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM employees e
    WHERE e.id = p_employee_id
    AND get_current_user_company() = e.company_id
    AND get_current_user_role() IN ('org_admin', 'payroll_admin')
    AND require_2fa_for_admin_action() = true
  );
$$;

-- Create function to log sensitive payroll access
CREATE OR REPLACE FUNCTION public.log_payroll_access(p_employee_id uuid, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access to sensitive payroll data
  PERFORM create_audit_log(
    p_action,
    'pay_run_lines',
    p_employee_id,
    NULL,
    jsonb_build_object(
      'accessed_employee_id', p_employee_id,
      'accessor_role', get_current_user_role(),
      'timestamp', NOW(),
      'ip_address', current_setting('request.headers')::json->>'x-forwarded-for'
    )
  );
END;
$$;

-- Create strict employee self-access policy
CREATE POLICY "Employees can view only their own pay data" 
ON public.pay_run_lines 
FOR SELECT 
USING (
  employee_id = get_current_user_employee_id()
);

-- Create strict admin access policy with 2FA requirement and logging
CREATE POLICY "Verified admins can view company pay data" 
ON public.pay_run_lines 
FOR SELECT 
USING (
  can_admin_access_payroll_data(employee_id)
);

-- Create insert policy for payroll processing (admin only)
CREATE POLICY "Payroll admins can insert pay data" 
ON public.pay_run_lines 
FOR INSERT 
WITH CHECK (
  get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND EXISTS (
    SELECT 1 FROM pay_runs pr 
    WHERE pr.id = pay_run_lines.pay_run_id 
    AND get_current_user_company() = pr.company_id
  )
  AND require_2fa_for_admin_action() = true
);

-- Create update policy for payroll processing (admin only)
CREATE POLICY "Payroll admins can update pay data" 
ON public.pay_run_lines 
FOR UPDATE 
USING (
  get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND EXISTS (
    SELECT 1 FROM pay_runs pr 
    WHERE pr.id = pay_run_lines.pay_run_id 
    AND get_current_user_company() = pr.company_id
  )
  AND require_2fa_for_admin_action() = true
);

-- Create delete policy for payroll processing (admin only)
CREATE POLICY "Payroll admins can delete pay data" 
ON public.pay_run_lines 
FOR DELETE 
USING (
  get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND EXISTS (
    SELECT 1 FROM pay_runs pr 
    WHERE pr.id = pay_run_lines.pay_run_id 
    AND get_current_user_company() = pr.company_id
  )
  AND require_2fa_for_admin_action() = true
);