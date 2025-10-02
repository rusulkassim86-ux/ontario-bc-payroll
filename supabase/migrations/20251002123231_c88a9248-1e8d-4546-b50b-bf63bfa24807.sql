-- Add columns to timesheets table for punch/manual tracking
ALTER TABLE public.timesheets
ADD COLUMN IF NOT EXISTS manual_hours NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS daily_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- Create view to calculate punch hours per day from punch pairs
CREATE OR REPLACE VIEW public.v_punch_hours AS
WITH punch_pairs AS (
  SELECT 
    p_in.employee_id,
    p_in.punch_timestamp::date AS work_date,
    p_in.punch_timestamp AS punch_in,
    p_out.punch_timestamp AS punch_out,
    EXTRACT(EPOCH FROM (p_out.punch_timestamp - p_in.punch_timestamp)) / 3600.0 AS hours
  FROM public.punches p_in
  JOIN public.punches p_out 
    ON p_in.employee_id = p_out.employee_id
    AND p_in.punch_timestamp::date = p_out.punch_timestamp::date
    AND p_in.direction = 'in'
    AND p_out.direction = 'out'
    AND p_out.punch_timestamp > p_in.punch_timestamp
  WHERE p_in.processed = true AND p_out.processed = true
)
SELECT
  employee_id,
  work_date,
  SUM(hours)::NUMERIC(6,2) AS punch_hours
FROM punch_pairs
GROUP BY employee_id, work_date;

-- Update save_timecard_draft to handle manual hours
CREATE OR REPLACE FUNCTION public.save_timecard_draft(
  p_employee_id UUID,
  p_entries JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  user_profile RECORD;
  employee_record RECORD;
  entry JSONB;
  saved_count INTEGER := 0;
  v_total NUMERIC(9,2) := 0;
  v_breakdown JSONB;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT role, company_id INTO user_profile FROM profiles WHERE user_id = current_user_id;
  SELECT id, company_id INTO employee_record FROM employees WHERE id = p_employee_id;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Employee not found'; END IF;
  IF employee_record.company_id != user_profile.company_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Process each entry
  FOR entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    INSERT INTO timesheets (
      employee_id, work_date, manual_hours, pay_code, status
    ) VALUES (
      p_employee_id,
      (entry->>'work_date')::date,
      CASE WHEN entry->>'hours' IS NOT NULL THEN (entry->>'hours')::numeric ELSE NULL END,
      entry->>'pay_code',
      'pending'
    )
    ON CONFLICT (employee_id, work_date)
    DO UPDATE SET
      manual_hours = CASE WHEN (entry->>'hours') IS NOT NULL THEN (entry->>'hours')::numeric ELSE NULL END,
      pay_code = EXCLUDED.pay_code,
      updated_at = NOW()
    WHERE timesheets.locked_at IS NULL;
    
    saved_count := saved_count + 1;
  END LOOP;
  
  -- Recompute all daily hours from punches or manual
  UPDATE timesheets t
  SET 
    daily_hours = COALESCE(
      CASE WHEN t.manual_hours IS NOT NULL THEN t.manual_hours ELSE ph.punch_hours END,
      0
    ),
    source = CASE WHEN t.manual_hours IS NOT NULL THEN 'manual' ELSE 'punch' END,
    hours = COALESCE(
      CASE WHEN t.manual_hours IS NOT NULL THEN t.manual_hours ELSE ph.punch_hours END,
      0
    )
  FROM v_punch_hours ph
  WHERE t.employee_id = p_employee_id
    AND ph.employee_id = t.employee_id
    AND ph.work_date = t.work_date;
  
  -- Handle days with no punches
  UPDATE timesheets t
  SET 
    daily_hours = COALESCE(t.manual_hours, 0),
    source = CASE WHEN t.manual_hours IS NOT NULL THEN 'manual' ELSE 'punch' END,
    hours = COALESCE(t.manual_hours, 0)
  WHERE t.employee_id = p_employee_id
    AND NOT EXISTS (
      SELECT 1 FROM v_punch_hours ph
      WHERE ph.employee_id = t.employee_id AND ph.work_date = t.work_date
    );
  
  -- Calculate total
  SELECT SUM(daily_hours)::NUMERIC(9,2) INTO v_total
  FROM timesheets WHERE employee_id = p_employee_id;
  
  -- Build breakdown
  SELECT jsonb_agg(
    jsonb_build_object(
      'work_date', work_date,
      'daily_hours', daily_hours,
      'source', source,
      'manual_hours', manual_hours,
      'pay_code', pay_code,
      'time_in', time_in,
      'time_out', time_out
    ) ORDER BY work_date
  ) INTO v_breakdown
  FROM timesheets WHERE employee_id = p_employee_id;
  
  PERFORM create_audit_log(
    'SAVE_TIMECARD_DRAFT',
    'timesheet',
    p_employee_id,
    NULL,
    jsonb_build_object('entries_saved', saved_count, 'total_hours', v_total)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'entries_saved', saved_count,
    'total_hours', COALESCE(v_total, 0),
    'breakdown', COALESCE(v_breakdown, '[]'::jsonb)
  );
END;
$$;