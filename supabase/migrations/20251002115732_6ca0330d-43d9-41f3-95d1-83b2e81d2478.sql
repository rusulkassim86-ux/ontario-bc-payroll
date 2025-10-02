-- Enhanced approval functions with validation, locking, and error handling

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.approve_timesheet_supervisor(uuid, date, date, jsonb, text, jsonb);
DROP FUNCTION IF EXISTS public.approve_timesheet_final(uuid, date, date, text);

-- Supervisor approval with validation and locking
CREATE OR REPLACE FUNCTION public.approve_timesheet_supervisor(
  p_employee_id uuid,
  p_start_date date,
  p_end_date date,
  p_selected_days jsonb,
  p_approval_note text,
  p_totals jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  approval_id UUID;
  current_user_id UUID;
  user_profile RECORD;
  employee_record RECORD;
  total_hours NUMERIC;
  employee_company_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user profile and validate permissions
  SELECT role, company_id, first_name, last_name INTO user_profile
  FROM profiles 
  WHERE user_id = current_user_id;
  
  IF user_profile.role NOT IN ('org_admin', 'payroll_admin', 'manager') THEN
    RAISE EXCEPTION 'Insufficient permissions - only supervisors/managers can approve';
  END IF;
  
  -- Get employee and verify company match (with row lock)
  SELECT e.id, e.first_name, e.last_name, e.employee_number, e.employee_group, e.company_id
  INTO employee_record
  FROM employees e
  WHERE e.id = p_employee_id
  FOR UPDATE; -- Row-level lock to prevent concurrent modifications
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;
  
  IF employee_record.company_id != user_profile.company_id THEN
    RAISE EXCEPTION 'Access denied - employee belongs to different company';
  END IF;
  
  -- Calculate total hours and validate (zero-hour check)
  total_hours := COALESCE((p_totals->>'reg')::numeric, 0) +
                 COALESCE((p_totals->>'ot')::numeric, 0) +
                 COALESCE((p_totals->>'stat')::numeric, 0) +
                 COALESCE((p_totals->>'vac')::numeric, 0) +
                 COALESCE((p_totals->>'sick')::numeric, 0);
  
  IF total_hours <= 0 THEN
    RAISE EXCEPTION 'Cannot approve timecard with zero hours';
  END IF;
  
  -- Check if already final approved (cannot re-approve)
  IF EXISTS (
    SELECT 1 FROM timesheet_approvals
    WHERE employee_id = p_employee_id
    AND pay_period_start = p_start_date
    AND pay_period_end = p_end_date
    AND approval_stage = 'final_approved'
    AND is_locked = true
  ) THEN
    RAISE EXCEPTION 'Timecard is already final approved and locked';
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
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    jsonb_build_object(
      'approval_type', 'supervisor',
      'approved_at', NOW(),
      'user_role', user_profile.role,
      'total_hours', total_hours
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
  
  -- Create audit log
  PERFORM create_audit_log(
    'SUPERVISOR_APPROVE_TIMECARD',
    'timesheet_approval',
    approval_id,
    NULL,
    jsonb_build_object(
      'employee_id', p_employee_id,
      'employee_name', employee_record.first_name || ' ' || employee_record.last_name,
      'employee_number', employee_record.employee_number,
      'company_id', user_profile.company_id,
      'period_start', p_start_date,
      'period_end', p_end_date,
      'total_hours', total_hours,
      'supervisor_name', user_profile.first_name || ' ' || user_profile.last_name
    )
  );
  
  RETURN approval_id;
END;
$function$;

-- HR/Payroll final approval with validation and locking
CREATE OR REPLACE FUNCTION public.approve_timesheet_final(
  p_employee_id uuid,
  p_start_date date,
  p_end_date date,
  p_approval_note text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  approval_id UUID;
  current_user_id UUID;
  user_profile RECORD;
  employee_record RECORD;
  approval_record RECORD;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user profile and validate permissions
  SELECT role, company_id, first_name, last_name INTO user_profile
  FROM profiles 
  WHERE user_id = current_user_id;
  
  -- Only payroll/HR admins can do final approval
  IF user_profile.role NOT IN ('org_admin', 'payroll_admin') THEN
    RAISE EXCEPTION 'Only Payroll/HR admins can perform final approval';
  END IF;
  
  -- Get employee and verify company match (with row lock)
  SELECT e.id, e.first_name, e.last_name, e.employee_number, e.company_id
  INTO employee_record
  FROM employees e
  WHERE e.id = p_employee_id
  FOR UPDATE; -- Row-level lock
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;
  
  IF employee_record.company_id != user_profile.company_id THEN
    RAISE EXCEPTION 'Access denied - employee belongs to different company';
  END IF;
  
  -- Get approval record and validate supervisor approval (with row lock)
  SELECT * INTO approval_record
  FROM timesheet_approvals
  WHERE employee_id = p_employee_id
  AND pay_period_start = p_start_date
  AND pay_period_end = p_end_date
  FOR UPDATE; -- Lock the approval record
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No timecard found for this period';
  END IF;
  
  -- Check if supervisor approval exists
  IF approval_record.approval_stage != 'supervisor_approved' THEN
    RAISE EXCEPTION 'Timecard must be supervisor-approved before final approval. Current stage: %', approval_record.approval_stage;
  END IF;
  
  -- Validate total hours (zero-hour check)
  IF COALESCE(approval_record.total_reg_hours, 0) + 
     COALESCE(approval_record.total_ot_hours, 0) + 
     COALESCE(approval_record.total_stat_hours, 0) + 
     COALESCE(approval_record.total_vac_hours, 0) + 
     COALESCE(approval_record.total_sick_hours, 0) <= 0 THEN
    RAISE EXCEPTION 'Cannot approve timecard with zero hours';
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
    'FINAL_APPROVE_TIMECARD',
    'timesheet_approval',
    approval_id,
    NULL,
    jsonb_build_object(
      'employee_id', p_employee_id,
      'employee_name', employee_record.first_name || ' ' || employee_record.last_name,
      'employee_number', employee_record.employee_number,
      'company_id', user_profile.company_id,
      'period_start', p_start_date,
      'period_end', p_end_date,
      'approver_name', user_profile.first_name || ' ' || user_profile.last_name
    )
  );
  
  RETURN approval_id;
END;
$function$;