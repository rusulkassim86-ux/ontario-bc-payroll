-- Create timecards header table
CREATE TABLE IF NOT EXISTS public.timecards (
  id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_code TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  pay_calendar_id UUID REFERENCES public.pay_calendars(id),
  status TEXT NOT NULL DEFAULT 'draft',
  total_hours NUMERIC(9,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, week_start, week_end)
);

-- Create timesheet_entries child table for daily entries
CREATE TABLE IF NOT EXISTS public.timesheet_entries (
  id BIGSERIAL PRIMARY KEY,
  timecard_id BIGINT NOT NULL REFERENCES public.timecards(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  pay_code TEXT,
  manual_hours NUMERIC(6,2),
  daily_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'punch',
  time_in TEXT,
  time_out TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (timecard_id, work_date)
);

-- Enable RLS on new tables
ALTER TABLE public.timecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for timecards
CREATE POLICY "Company members can view timecards"
ON public.timecards FOR SELECT
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = timecards.employee_id
  AND e.company_id = get_current_user_company()
));

CREATE POLICY "Admins can manage timecards"
ON public.timecards FOR ALL
USING (
  get_current_user_role() IN ('org_admin', 'payroll_admin')
  AND EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = timecards.employee_id
    AND e.company_id = get_current_user_company()
  )
);

-- RLS policies for timesheet_entries
CREATE POLICY "Company members can view entries"
ON public.timesheet_entries FOR SELECT
USING (EXISTS (
  SELECT 1 FROM timecards tc
  JOIN employees e ON e.id = tc.employee_id
  WHERE tc.id = timesheet_entries.timecard_id
  AND e.company_id = get_current_user_company()
));

CREATE POLICY "Admins can manage entries"
ON public.timesheet_entries FOR ALL
USING (EXISTS (
  SELECT 1 FROM timecards tc
  JOIN employees e ON e.id = tc.employee_id
  WHERE tc.id = timesheet_entries.timecard_id
  AND e.company_id = get_current_user_company()
  AND get_current_user_role() IN ('org_admin', 'payroll_admin')
));

-- Update v_punch_hours view to work with new structure
DROP VIEW IF EXISTS public.v_punch_hours;
CREATE VIEW public.v_punch_hours AS
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

-- Function to recompute a whole timecard
CREATE OR REPLACE FUNCTION public.recompute_timecard(p_timecard_id BIGINT)
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_employee_id UUID;
BEGIN
  -- Get timecard details
  SELECT week_start, week_end, employee_id
  INTO v_week_start, v_week_end, v_employee_id
  FROM public.timecards
  WHERE id = p_timecard_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Timecard % not found', p_timecard_id;
  END IF;

  -- Ensure rows exist for every date in the period
  INSERT INTO public.timesheet_entries (timecard_id, work_date)
  SELECT p_timecard_id, d::date
  FROM generate_series(v_week_start, v_week_end, interval '1 day') AS d
  ON CONFLICT (timecard_id, work_date) DO NOTHING;

  -- Recompute daily_hours and source
  UPDATE public.timesheet_entries e
  SET 
    daily_hours = COALESCE(
      CASE WHEN e.manual_hours IS NOT NULL THEN e.manual_hours ELSE ph.punch_hours END, 
      0
    ),
    source = CASE WHEN e.manual_hours IS NOT NULL THEN 'manual' ELSE 'punch' END,
    updated_at = NOW()
  FROM public.v_punch_hours ph
  WHERE e.timecard_id = p_timecard_id
    AND ph.employee_id = v_employee_id
    AND ph.work_date = e.work_date;

  -- Rows with no punches and no manual -> zero, source stays 'punch'
  UPDATE public.timesheet_entries
  SET 
    daily_hours = COALESCE(manual_hours, 0),
    source = CASE WHEN manual_hours IS NOT NULL THEN 'manual' ELSE 'punch' END,
    updated_at = NOW()
  WHERE timecard_id = p_timecard_id
    AND NOT EXISTS (
      SELECT 1 FROM public.v_punch_hours ph
      WHERE ph.employee_id = v_employee_id
      AND ph.work_date = timesheet_entries.work_date
    );

  -- Roll up to header total
  UPDATE public.timecards t
  SET 
    total_hours = COALESCE(v.sum_hours, 0),
    updated_at = NOW()
  FROM (
    SELECT timecard_id, SUM(daily_hours)::NUMERIC(9,2) AS sum_hours
    FROM public.timesheet_entries
    WHERE timecard_id = p_timecard_id
    GROUP BY timecard_id
  ) v
  WHERE t.id = p_timecard_id;
END $$;

-- Function to get or create timecard for a period
CREATE OR REPLACE FUNCTION public.get_or_create_timecard(
  p_employee_id UUID,
  p_week_start DATE,
  p_week_end DATE
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timecard_id BIGINT;
  v_company_code TEXT;
  v_pay_calendar_id UUID;
BEGIN
  -- Get employee company code
  SELECT company_code INTO v_company_code
  FROM employees
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee % not found', p_employee_id;
  END IF;

  -- Get pay calendar for this period
  BEGIN
    v_pay_calendar_id := get_pay_calendar_for_date(p_employee_id, p_week_start);
  EXCEPTION WHEN OTHERS THEN
    v_pay_calendar_id := NULL;
  END;

  -- Get or create timecard
  INSERT INTO public.timecards (employee_id, company_code, week_start, week_end, pay_calendar_id)
  VALUES (p_employee_id, v_company_code, p_week_start, p_week_end, v_pay_calendar_id)
  ON CONFLICT (employee_id, week_start, week_end)
  DO UPDATE SET pay_calendar_id = COALESCE(timecards.pay_calendar_id, EXCLUDED.pay_calendar_id)
  RETURNING id INTO v_timecard_id;

  -- Initialize entries for all days
  PERFORM recompute_timecard(v_timecard_id);

  RETURN v_timecard_id;
END $$;