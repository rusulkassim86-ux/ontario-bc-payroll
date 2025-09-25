-- Add approval workflow columns to timesheets table
ALTER TABLE public.timesheets 
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approval_note TEXT,
ADD COLUMN IF NOT EXISTS pay_period_start DATE,
ADD COLUMN IF NOT EXISTS pay_period_end DATE;

-- Create timesheet_approvals table for detailed approval tracking
CREATE TABLE IF NOT EXISTS public.timesheet_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  approved_by UUID NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approval_note TEXT,
  total_reg_hours NUMERIC NOT NULL DEFAULT 0,
  total_ot_hours NUMERIC NOT NULL DEFAULT 0,
  total_stat_hours NUMERIC NOT NULL DEFAULT 0,
  total_vac_hours NUMERIC NOT NULL DEFAULT 0,
  total_sick_hours NUMERIC NOT NULL DEFAULT 0,
  selected_days JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_ip TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, pay_period_start, pay_period_end)
);

-- Enable RLS on timesheet_approvals
ALTER TABLE public.timesheet_approvals ENABLE ROW LEVEL SECURITY;

-- RLS policies for timesheet_approvals
CREATE POLICY "Managers can view timesheet approvals" 
ON public.timesheet_approvals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    JOIN employees e ON e.id = timesheet_approvals.employee_id
    WHERE p.user_id = auth.uid() 
    AND p.company_id = e.company_id 
    AND p.role = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text, 'manager'::text])
  )
);

CREATE POLICY "Managers can create timesheet approvals" 
ON public.timesheet_approvals 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles p
    JOIN employees e ON e.id = timesheet_approvals.employee_id
    WHERE p.user_id = auth.uid() 
    AND p.company_id = e.company_id 
    AND p.role = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text, 'manager'::text])
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_timesheet_approvals_updated_at
BEFORE UPDATE ON public.timesheet_approvals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function for approving timesheets
CREATE OR REPLACE FUNCTION public.approve_timesheet(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_selected_days JSONB,
  p_approval_note TEXT,
  p_totals JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  approval_id UUID;
  current_user_id UUID;
  user_profile RECORD;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check user permissions
  SELECT role, company_id INTO user_profile
  FROM profiles 
  WHERE user_id = current_user_id;
  
  IF user_profile.role NOT IN ('org_admin', 'payroll_admin', 'manager') THEN
    RAISE EXCEPTION 'Insufficient permissions to approve timesheets';
  END IF;
  
  -- Verify employee belongs to same company
  IF NOT EXISTS (
    SELECT 1 FROM employees 
    WHERE id = p_employee_id 
    AND company_id = user_profile.company_id
  ) THEN
    RAISE EXCEPTION 'Employee not found or access denied';
  END IF;
  
  -- Create approval record
  INSERT INTO public.timesheet_approvals (
    employee_id,
    pay_period_start,
    pay_period_end,
    approved_by,
    approval_note,
    total_reg_hours,
    total_ot_hours,
    total_stat_hours,
    total_vac_hours,
    total_sick_hours,
    selected_days,
    client_ip,
    metadata
  ) VALUES (
    p_employee_id,
    p_start_date,
    p_end_date,
    current_user_id,
    p_approval_note,
    COALESCE((p_totals->>'reg')::numeric, 0),
    COALESCE((p_totals->>'ot')::numeric, 0),
    COALESCE((p_totals->>'stat')::numeric, 0),
    COALESCE((p_totals->>'vac')::numeric, 0),
    COALESCE((p_totals->>'sick')::numeric, 0),
    p_selected_days,
    current_setting('request.headers')::json->>'x-forwarded-for',
    jsonb_build_object(
      'approved_at', NOW(),
      'user_role', user_profile.role
    )
  ) 
  ON CONFLICT (employee_id, pay_period_start, pay_period_end)
  DO UPDATE SET
    approved_by = EXCLUDED.approved_by,
    approved_at = NOW(),
    approval_note = EXCLUDED.approval_note,
    total_reg_hours = EXCLUDED.total_reg_hours,
    total_ot_hours = EXCLUDED.total_ot_hours,
    total_stat_hours = EXCLUDED.total_stat_hours,
    total_vac_hours = EXCLUDED.total_vac_hours,
    total_sick_hours = EXCLUDED.total_sick_hours,
    selected_days = EXCLUDED.selected_days,
    client_ip = EXCLUDED.client_ip,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING id INTO approval_id;
  
  -- Update timesheets status for the period
  UPDATE public.timesheets
  SET 
    status = 'approved',
    locked_at = NOW(),
    approval_note = p_approval_note,
    pay_period_start = p_start_date,
    pay_period_end = p_end_date,
    approved_by = current_user_id,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE employee_id = p_employee_id
  AND work_date >= p_start_date
  AND work_date <= p_end_date;
  
  -- Create audit log
  PERFORM create_audit_log(
    'APPROVE_TIMESHEET',
    'timesheet_approval',
    approval_id,
    NULL,
    jsonb_build_object(
      'employee_id', p_employee_id,
      'period_start', p_start_date,
      'period_end', p_end_date,
      'selected_days', p_selected_days,
      'approval_note', p_approval_note,
      'totals', p_totals
    )
  );
  
  RETURN approval_id;
END;
$$;