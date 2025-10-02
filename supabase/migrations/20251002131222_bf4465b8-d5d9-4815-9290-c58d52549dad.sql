-- Create helper function to find the correct pay calendar for a given date and employee
CREATE OR REPLACE FUNCTION public.get_pay_calendar_for_date(
  p_employee_id UUID,
  p_work_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay_calendar_id UUID;
  v_company_id UUID;
  v_pay_frequency TEXT;
BEGIN
  -- Get employee's company and pay frequency
  SELECT company_id, pay_frequency
  INTO v_company_id, v_pay_frequency
  FROM employees
  WHERE id = p_employee_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found: %', p_employee_id;
  END IF;
  
  -- Find the pay calendar that covers this work date
  SELECT id INTO v_pay_calendar_id
  FROM pay_calendars
  WHERE company_id = v_company_id
    AND frequency = COALESCE(v_pay_frequency, 'biweekly')
    AND p_work_date >= period_start
    AND p_work_date <= period_end
  ORDER BY period_start DESC
  LIMIT 1;
  
  -- If no pay calendar found, try to find the nearest one
  IF v_pay_calendar_id IS NULL THEN
    SELECT id INTO v_pay_calendar_id
    FROM pay_calendars
    WHERE company_id = v_company_id
      AND frequency = COALESCE(v_pay_frequency, 'biweekly')
    ORDER BY ABS(EXTRACT(EPOCH FROM (period_start - p_work_date)))
    LIMIT 1;
  END IF;
  
  IF v_pay_calendar_id IS NULL THEN
    RAISE EXCEPTION 'No pay calendar found for employee % on date %. Please create a pay calendar first.', p_employee_id, p_work_date;
  END IF;
  
  RETURN v_pay_calendar_id;
END;
$$;

-- Update save_timecard_draft to auto-assign pay_calendar_id and track source
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
  v_pay_calendar_id UUID;
  v_work_date DATE;
  v_hours NUMERIC;
  v_pay_code TEXT;
  v_source TEXT;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT role, company_id INTO user_profile FROM profiles WHERE user_id = current_user_id;
  SELECT id, company_id INTO employee_record FROM employees WHERE id = p_employee_id;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Employee not found'; 
  END IF;
  
  IF employee_record.company_id != user_profile.company_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Process each entry
  FOR entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_work_date := (entry->>'work_date')::date;
    v_hours := CASE WHEN entry->>'hours' IS NOT NULL AND (entry->>'hours') != '' 
                   THEN (entry->>'hours')::numeric 
                   ELSE NULL 
              END;
    v_pay_code := entry->>'pay_code';
    
    -- Determine source: if hours are provided, it's manual; otherwise check for punches
    v_source := CASE 
      WHEN v_hours IS NOT NULL THEN 'manual'
      ELSE 'punch'
    END;
    
    -- Get the appropriate pay calendar for this date
    BEGIN
      v_pay_calendar_id := get_pay_calendar_for_date(p_employee_id, v_work_date);
    EXCEPTION WHEN OTHERS THEN
      -- If we can't find a pay calendar, log error and skip this entry
      RAISE WARNING 'Could not find pay calendar for employee % on date %: %', 
        p_employee_id, v_work_date, SQLERRM;
      CONTINUE;
    END;
    
    -- Auto-fill pay_code if missing (default to REG)
    IF v_pay_code IS NULL OR v_pay_code = '' THEN
      v_pay_code := 'REG';
    END IF;
    
    -- Insert or update timesheet entry
    INSERT INTO timesheets (
      employee_id, 
      work_date, 
      manual_hours, 
      pay_code, 
      pay_calendar_id,
      source,
      status
    ) VALUES (
      p_employee_id,
      v_work_date,
      v_hours,
      v_pay_code,
      v_pay_calendar_id,
      v_source,
      'pending'
    )
    ON CONFLICT (employee_id, work_date)
    DO UPDATE SET
      manual_hours = EXCLUDED.manual_hours,
      pay_code = EXCLUDED.pay_code,
      pay_calendar_id = EXCLUDED.pay_calendar_id,
      source = EXCLUDED.source,
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
      'pay_calendar_id', pay_calendar_id,
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
    jsonb_build_object(
      'entries_saved', saved_count, 
      'total_hours', v_total,
      'source_tracking', true
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'entries_saved', saved_count,
    'total_hours', COALESCE(v_total, 0),
    'breakdown', COALESCE(v_breakdown, '[]'::jsonb)
  );
END;
$$;

-- Add comment explaining the source field
COMMENT ON COLUMN timesheets.source IS 'Tracks entry source: manual (user entered) or punch (from time clock). Only visible to Admin/Payroll Manager roles.';