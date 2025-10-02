-- Update approve_timesheet_supervisor to recalculate totals from database
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
  calculated_totals RECORD;
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
  
  -- RECALCULATE TOTALS FROM DATABASE (not from UI state)
  SELECT
    COALESCE(SUM(CASE WHEN pay_code = 'REG' THEN hours ELSE 0 END), 0) as reg_hours,
    COALESCE(SUM(CASE WHEN pay_code IN ('OT', 'OT1', 'OT2', 'O/T') THEN hours ELSE 0 END), 0) as ot_hours,
    COALESCE(SUM(CASE WHEN pay_code = 'STAT' THEN hours ELSE 0 END), 0) as stat_hours,
    COALESCE(SUM(CASE WHEN pay_code = 'VAC' THEN hours ELSE 0 END), 0) as vac_hours,
    COALESCE(SUM(CASE WHEN pay_code = 'SICK' THEN hours ELSE 0 END), 0) as sick_hours
  INTO calculated_totals
  FROM timesheets
  WHERE employee_id = p_employee_id
    AND work_date >= p_start_date
    AND work_date <= p_end_date
    AND pay_code NOT IN ('UNPAID', 'ABSENCE', 'LWP');
  
  -- Calculate total hours and validate (zero-hour check)
  total_hours := calculated_totals.reg_hours + calculated_totals.ot_hours + 
                 calculated_totals.stat_hours + calculated_totals.vac_hours + 
                 calculated_totals.sick_hours;
  
  IF total_hours <= 0 THEN
    RAISE EXCEPTION 'Cannot approve timecard with zero hours. Calculated total: %', total_hours;
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
    calculated_totals.reg_hours,
    calculated_totals.ot_hours,
    calculated_totals.stat_hours,
    calculated_totals.vac_hours,
    calculated_totals.sick_hours,
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
      'total_hours', total_hours,
      'recalculated_from_db', true
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
      'supervisor_name', user_profile.first_name || ' ' || user_profile.last_name,
      'recalculated_totals', jsonb_build_object(
        'reg', calculated_totals.reg_hours,
        'ot', calculated_totals.ot_hours,
        'stat', calculated_totals.stat_hours,
        'vac', calculated_totals.vac_hours,
        'sick', calculated_totals.sick_hours
      )
    )
  );
  
  RETURN approval_id;
END;
$function$;

-- Update approve_timesheet_final to recalculate totals from database
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
  total_hours NUMERIC;
  calculated_totals RECORD;
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
  
  -- RECALCULATE TOTALS FROM DATABASE (not from approval record)
  SELECT
    COALESCE(SUM(CASE WHEN pay_code = 'REG' THEN hours ELSE 0 END), 0) as reg_hours,
    COALESCE(SUM(CASE WHEN pay_code IN ('OT', 'OT1', 'OT2', 'O/T') THEN hours ELSE 0 END), 0) as ot_hours,
    COALESCE(SUM(CASE WHEN pay_code = 'STAT' THEN hours ELSE 0 END), 0) as stat_hours,
    COALESCE(SUM(CASE WHEN pay_code = 'VAC' THEN hours ELSE 0 END), 0) as vac_hours,
    COALESCE(SUM(CASE WHEN pay_code = 'SICK' THEN hours ELSE 0 END), 0) as sick_hours
  INTO calculated_totals
  FROM timesheets
  WHERE employee_id = p_employee_id
    AND work_date >= p_start_date
    AND work_date <= p_end_date
    AND pay_code NOT IN ('UNPAID', 'ABSENCE', 'LWP');
  
  -- Calculate total hours and validate
  total_hours := calculated_totals.reg_hours + calculated_totals.ot_hours + 
                 calculated_totals.stat_hours + calculated_totals.vac_hours + 
                 calculated_totals.sick_hours;
  
  IF total_hours <= 0 THEN
    RAISE EXCEPTION 'Cannot approve timecard with zero hours. Calculated total: %', total_hours;
  END IF;
  
  -- Get approval record and validate supervisor approval (with row lock)
  SELECT * INTO approval_record
  FROM timesheet_approvals
  WHERE employee_id = p_employee_id
    AND pay_period_start = p_start_date
    AND pay_period_end = p_end_date
  FOR UPDATE; -- Lock the approval record
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No timecard approval found for this period. Must be supervisor-approved first.';
  END IF;
  
  -- Check if supervisor approval exists
  IF approval_record.approval_stage NOT IN ('supervisor_approved', 'final_approved') THEN
    RAISE EXCEPTION 'Timecard must be supervisor-approved before final approval. Current stage: %', approval_record.approval_stage;
  END IF;
  
  -- Update approval record with final approval and lock
  UPDATE timesheet_approvals
  SET
    approval_stage = 'final_approved',
    final_approved_by = current_user_id,
    final_approved_at = NOW(),
    is_locked = TRUE,
    approval_note = COALESCE(p_approval_note, approval_note),
    total_reg_hours = calculated_totals.reg_hours,
    total_ot_hours = calculated_totals.ot_hours,
    total_stat_hours = calculated_totals.stat_hours,
    total_vac_hours = calculated_totals.vac_hours,
    total_sick_hours = calculated_totals.sick_hours,
    updated_at = NOW(),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'final_approval_recalculated_from_db', true,
      'final_total_hours', total_hours
    )
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
      'total_hours', total_hours,
      'approver_name', user_profile.first_name || ' ' || user_profile.last_name,
      'recalculated_totals', jsonb_build_object(
        'reg', calculated_totals.reg_hours,
        'ot', calculated_totals.ot_hours,
        'stat', calculated_totals.stat_hours,
        'vac', calculated_totals.vac_hours,
        'sick', calculated_totals.sick_hours
      )
    )
  );
  
  RETURN approval_id;
END;
$function$;

-- Create function to save timecard draft (upsert timesheet entries)
CREATE OR REPLACE FUNCTION public.save_timecard_draft(
  p_employee_id uuid,
  p_entries jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  user_profile RECORD;
  employee_record RECORD;
  entry JSONB;
  saved_count INTEGER := 0;
  result_totals RECORD;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user profile
  SELECT role, company_id INTO user_profile
  FROM profiles 
  WHERE user_id = current_user_id;
  
  -- Get employee and verify company match
  SELECT e.id, e.company_id INTO employee_record
  FROM employees e
  WHERE e.id = p_employee_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;
  
  IF employee_record.company_id != user_profile.company_id THEN
    RAISE EXCEPTION 'Access denied - employee belongs to different company';
  END IF;
  
  -- Process each entry
  FOR entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    -- Upsert timesheet entry
    INSERT INTO timesheets (
      employee_id,
      work_date,
      hours,
      pay_code,
      time_in,
      time_out,
      status,
      created_at,
      updated_at
    ) VALUES (
      p_employee_id,
      (entry->>'work_date')::date,
      COALESCE((entry->>'hours')::numeric, 0),
      entry->>'pay_code',
      entry->>'time_in',
      entry->>'time_out',
      'pending',
      NOW(),
      NOW()
    )
    ON CONFLICT (employee_id, work_date)
    DO UPDATE SET
      hours = COALESCE((entry->>'hours')::numeric, 0),
      pay_code = entry->>'pay_code',
      time_in = entry->>'time_in',
      time_out = entry->>'time_out',
      updated_at = NOW()
    WHERE timesheets.locked_at IS NULL; -- Only update unlocked entries
    
    saved_count := saved_count + 1;
  END LOOP;
  
  -- Calculate totals from saved data
  SELECT
    COALESCE(SUM(CASE WHEN pay_code = 'REG' THEN hours ELSE 0 END), 0) as reg_hours,
    COALESCE(SUM(CASE WHEN pay_code IN ('OT', 'OT1', 'OT2', 'O/T') THEN hours ELSE 0 END), 0) as ot_hours,
    COALESCE(SUM(CASE WHEN pay_code = 'STAT' THEN hours ELSE 0 END), 0) as stat_hours,
    COALESCE(SUM(CASE WHEN pay_code = 'VAC' THEN hours ELSE 0 END), 0) as vac_hours,
    COALESCE(SUM(CASE WHEN pay_code = 'SICK' THEN hours ELSE 0 END), 0) as sick_hours,
    COALESCE(SUM(hours), 0) as total_hours
  INTO result_totals
  FROM timesheets
  WHERE employee_id = p_employee_id
    AND pay_code NOT IN ('UNPAID', 'ABSENCE', 'LWP');
  
  -- Create audit log
  PERFORM create_audit_log(
    'SAVE_TIMECARD_DRAFT',
    'timesheet',
    p_employee_id,
    NULL,
    jsonb_build_object(
      'employee_id', p_employee_id,
      'entries_saved', saved_count,
      'total_hours', result_totals.total_hours,
      'saved_at', NOW()
    )
  );
  
  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'entries_saved', saved_count,
    'totals', jsonb_build_object(
      'reg', result_totals.reg_hours,
      'ot', result_totals.ot_hours,
      'stat', result_totals.stat_hours,
      'vac', result_totals.vac_hours,
      'sick', result_totals.sick_hours,
      'total', result_totals.total_hours
    )
  );
END;
$function$;