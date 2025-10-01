-- Add two-step approval columns to timesheet_approvals table
ALTER TABLE timesheet_approvals 
ADD COLUMN IF NOT EXISTS approval_stage TEXT DEFAULT 'pending' CHECK (approval_stage IN ('pending', 'supervisor_approved', 'final_approved')),
ADD COLUMN IF NOT EXISTS supervisor_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS supervisor_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS final_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS final_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS unlocked_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS unlock_reason TEXT;

-- Update existing approved records to be final_approved
UPDATE timesheet_approvals 
SET approval_stage = 'final_approved',
    final_approved_by = approved_by,
    final_approved_at = approved_at,
    is_locked = TRUE
WHERE approved_at IS NOT NULL AND approval_stage = 'pending';

-- Create function for supervisor approval
CREATE OR REPLACE FUNCTION approve_timesheet_supervisor(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_selected_days JSONB,
  p_approval_note TEXT,
  p_totals JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  approval_id UUID;
  current_user_id UUID;
  user_profile RECORD;
  employee_supervisor_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Get current user profile
  SELECT role, company_id INTO user_profile
  FROM profiles 
  WHERE user_id = current_user_id;
  
  -- Check if user is a manager/supervisor
  IF user_profile.role NOT IN ('manager', 'org_admin', 'payroll_admin') THEN
    RAISE EXCEPTION 'Insufficient permissions - only supervisors can approve';
  END IF;
  
  -- Get employee's supervisor
  SELECT reports_to_id INTO employee_supervisor_id
  FROM employees 
  WHERE id = p_employee_id;
  
  -- Verify supervisor relationship (unless admin)
  IF user_profile.role NOT IN ('org_admin', 'payroll_admin') THEN
    IF employee_supervisor_id IS NULL OR employee_supervisor_id != (
      SELECT id FROM employees WHERE id = (
        SELECT employee_id FROM profiles WHERE user_id = current_user_id
      )
    ) THEN
      RAISE EXCEPTION 'You can only approve timecards for your direct reports';
    END IF;
  END IF;
  
  -- Create or update approval record with supervisor approval
  INSERT INTO timesheet_approvals (
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
    approval_stage,
    supervisor_approved_by,
    supervisor_approved_at,
    is_locked,
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
    'supervisor_approved',
    current_user_id,
    NOW(),
    FALSE,
    current_setting('request.headers')::json->>'x-forwarded-for',
    jsonb_build_object(
      'approval_type', 'supervisor',
      'approved_at', NOW(),
      'user_role', user_profile.role
    )
  )
  ON CONFLICT (employee_id, pay_period_start, pay_period_end)
  DO UPDATE SET
    approved_by = EXCLUDED.approved_by,
    approval_note = EXCLUDED.approval_note,
    total_reg_hours = EXCLUDED.total_reg_hours,
    total_ot_hours = EXCLUDED.total_ot_hours,
    total_stat_hours = EXCLUDED.total_stat_hours,
    total_vac_hours = EXCLUDED.total_vac_hours,
    total_sick_hours = EXCLUDED.total_sick_hours,
    selected_days = EXCLUDED.selected_days,
    approval_stage = 'supervisor_approved',
    supervisor_approved_by = EXCLUDED.supervisor_approved_by,
    supervisor_approved_at = NOW(),
    is_locked = FALSE,
    updated_at = NOW()
  RETURNING id INTO approval_id;
  
  -- Update timesheets status
  UPDATE timesheets
  SET 
    status = 'supervisor_approved',
    approval_note = p_approval_note,
    pay_period_start = p_start_date,
    pay_period_end = p_end_date,
    approved_by = current_user_id,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE employee_id = p_employee_id
  AND work_date >= p_start_date
  AND work_date <= p_end_date;
  
  RETURN approval_id;
END;
$$;

-- Create function for final HR/Payroll approval
CREATE OR REPLACE FUNCTION approve_timesheet_final(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_approval_note TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  approval_id UUID;
  current_user_id UUID;
  user_profile RECORD;
BEGIN
  current_user_id := auth.uid();
  
  -- Get current user profile
  SELECT role, company_id INTO user_profile
  FROM profiles 
  WHERE user_id = current_user_id;
  
  -- Only payroll/HR admins can do final approval
  IF user_profile.role NOT IN ('org_admin', 'payroll_admin') THEN
    RAISE EXCEPTION 'Only Payroll/HR admins can perform final approval';
  END IF;
  
  -- Check if supervisor approval exists
  IF NOT EXISTS (
    SELECT 1 FROM timesheet_approvals
    WHERE employee_id = p_employee_id
    AND pay_period_start = p_start_date
    AND pay_period_end = p_end_date
    AND approval_stage = 'supervisor_approved'
  ) THEN
    RAISE EXCEPTION 'Timecard must be supervisor-approved before final approval';
  END IF;
  
  -- Update approval record with final approval and lock
  UPDATE timesheet_approvals
  SET
    approval_stage = 'final_approved',
    final_approved_by = current_user_id,
    final_approved_at = NOW(),
    is_locked = TRUE,
    approval_note = COALESCE(p_approval_note, approval_note),
    updated_at = NOW()
  WHERE employee_id = p_employee_id
  AND pay_period_start = p_start_date
  AND pay_period_end = p_end_date
  RETURNING id INTO approval_id;
  
  -- Update timesheets status to final approved and lock
  UPDATE timesheets
  SET 
    status = 'final_approved',
    locked_at = NOW(),
    approval_note = COALESCE(p_approval_note, approval_note),
    updated_at = NOW()
  WHERE employee_id = p_employee_id
  AND work_date >= p_start_date
  AND work_date <= p_end_date;
  
  -- Create audit log
  PERFORM create_audit_log(
    'TIMESHEET_FINAL_APPROVAL',
    'timesheet_approval',
    approval_id,
    NULL,
    jsonb_build_object(
      'employee_id', p_employee_id,
      'period_start', p_start_date,
      'period_end', p_end_date,
      'approval_note', p_approval_note,
      'final_approved_by', current_user_id
    )
  );
  
  RETURN approval_id;
END;
$$;

-- Create function to unlock timecard (admin override)
CREATE OR REPLACE FUNCTION unlock_timesheet(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_unlock_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  approval_id UUID;
  current_user_id UUID;
  user_profile RECORD;
BEGIN
  current_user_id := auth.uid();
  
  -- Get current user profile
  SELECT role INTO user_profile
  FROM profiles 
  WHERE user_id = current_user_id;
  
  -- Only admins can unlock
  IF user_profile.role NOT IN ('org_admin', 'payroll_admin') THEN
    RAISE EXCEPTION 'Only admins can unlock timecards';
  END IF;
  
  -- Unlock the timecard
  UPDATE timesheet_approvals
  SET
    is_locked = FALSE,
    unlocked_by = current_user_id,
    unlocked_at = NOW(),
    unlock_reason = p_unlock_reason,
    updated_at = NOW()
  WHERE employee_id = p_employee_id
  AND pay_period_start = p_start_date
  AND pay_period_end = p_end_date
  RETURNING id INTO approval_id;
  
  -- Update timesheets to allow editing
  UPDATE timesheets
  SET 
    locked_at = NULL,
    updated_at = NOW()
  WHERE employee_id = p_employee_id
  AND work_date >= p_start_date
  AND work_date <= p_end_date;
  
  -- Create audit log
  PERFORM create_audit_log(
    'TIMESHEET_UNLOCKED',
    'timesheet_approval',
    approval_id,
    NULL,
    jsonb_build_object(
      'employee_id', p_employee_id,
      'period_start', p_start_date,
      'period_end', p_end_date,
      'unlock_reason', p_unlock_reason,
      'unlocked_by', current_user_id
    )
  );
  
  RETURN approval_id;
END;
$$;