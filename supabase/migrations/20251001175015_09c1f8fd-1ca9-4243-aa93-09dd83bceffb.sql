-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('supervisor_approval', 'final_approval', 'rejection', 'unlock')),
  related_entity_type TEXT,
  related_entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  action_url TEXT
);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  slack_enabled BOOLEAN DEFAULT false,
  slack_webhook_url TEXT,
  payroll_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  quiet_hours_start TIME DEFAULT '21:00:00',
  quiet_hours_end TIME DEFAULT '07:00:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- RLS policies for notification_settings
CREATE POLICY "Company members can view notification settings"
ON public.notification_settings FOR SELECT
USING (get_current_user_company() = company_id);

CREATE POLICY "Admins can manage notification settings"
ON public.notification_settings FOR ALL
USING (
  get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND get_current_user_company() = company_id
);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_type TEXT,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_action_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    body,
    type,
    related_entity_type,
    related_entity_id,
    metadata,
    action_url
  ) VALUES (
    p_user_id,
    p_title,
    p_body,
    p_type,
    p_related_entity_type,
    p_related_entity_id,
    p_metadata,
    p_action_url
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET read_at = now()
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND read_at IS NULL;
END;
$$;

-- Function to get unread count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM public.notifications
  WHERE user_id = auth.uid()
    AND read_at IS NULL;
  
  RETURN unread_count;
END;
$$;

-- Update approve_timesheet_supervisor to trigger notifications
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
SET search_path = public
AS $$
DECLARE
  approval_id UUID;
  current_user_id UUID;
  user_profile RECORD;
  employee_record RECORD;
  employee_supervisor_id UUID;
  payroll_admin RECORD;
  notification_settings RECORD;
BEGIN
  current_user_id := auth.uid();
  
  -- Get current user profile
  SELECT role, company_id, first_name, last_name INTO user_profile
  FROM profiles 
  WHERE user_id = current_user_id;
  
  -- Check if user is a manager/supervisor
  IF user_profile.role NOT IN ('manager', 'org_admin', 'payroll_admin') THEN
    RAISE EXCEPTION 'Insufficient permissions - only supervisors can approve';
  END IF;
  
  -- Get employee details
  SELECT e.first_name, e.last_name, e.employee_number, e.employee_group
  INTO employee_record
  FROM employees e
  WHERE e.id = p_employee_id;
  
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
  
  -- Get notification settings
  SELECT * INTO notification_settings
  FROM notification_settings
  WHERE company_id = user_profile.company_id;
  
  -- Create notifications for all payroll admins
  FOR payroll_admin IN 
    SELECT user_id, first_name, last_name
    FROM profiles
    WHERE company_id = user_profile.company_id
      AND role IN ('org_admin', 'payroll_admin')
      AND is_active = true
  LOOP
    PERFORM create_notification(
      payroll_admin.user_id,
      'Timesheet ready for HR review',
      employee_record.first_name || ' ' || employee_record.last_name || ' (' || employee_record.employee_group || ') Bi-Weekly ' || 
        to_char(p_start_date, 'Mon DD') || '–' || to_char(p_end_date, 'Mon DD, YYYY') || 
        ' approved by ' || user_profile.first_name || ' ' || user_profile.last_name || '.',
      'supervisor_approval',
      'timesheet_approval',
      approval_id,
      jsonb_build_object(
        'employee_id', p_employee_id,
        'employee_name', employee_record.first_name || ' ' || employee_record.last_name,
        'employee_number', employee_record.employee_number,
        'company_code', employee_record.employee_group,
        'period_start', p_start_date,
        'period_end', p_end_date,
        'supervisor_name', user_profile.first_name || ' ' || user_profile.last_name,
        'totals', p_totals
      ),
      '/timecard/' || employee_record.employee_number || '?start=' || p_start_date || '&end=' || p_end_date
    );
  END LOOP;
  
  -- Trigger email notification (handled by edge function via webhook)
  PERFORM pg_notify('timesheet_supervisor_approved', json_build_object(
    'approval_id', approval_id,
    'employee_id', p_employee_id,
    'employee_name', employee_record.first_name || ' ' || employee_record.last_name,
    'employee_number', employee_record.employee_number,
    'company_code', employee_record.employee_group,
    'company_id', user_profile.company_id,
    'period_start', p_start_date,
    'period_end', p_end_date,
    'supervisor_name', user_profile.first_name || ' ' || user_profile.last_name,
    'totals', p_totals,
    'action_url', '/timecard/' || employee_record.employee_number || '?start=' || p_start_date || '&end=' || p_end_date
  )::text);
  
  RETURN approval_id;
END;
$$;

-- Update approve_timesheet_final to trigger notifications
CREATE OR REPLACE FUNCTION public.approve_timesheet_final(
  p_employee_id uuid, 
  p_start_date date, 
  p_end_date date, 
  p_approval_note text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  approval_id UUID;
  current_user_id UUID;
  user_profile RECORD;
  employee_record RECORD;
  supervisor_user_id UUID;
  employee_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Get current user profile
  SELECT role, company_id, first_name, last_name INTO user_profile
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
  
  -- Get employee details
  SELECT e.first_name, e.last_name, e.employee_number, e.employee_group
  INTO employee_record
  FROM employees e
  WHERE e.id = p_employee_id;
  
  -- Get supervisor user_id
  SELECT p.user_id INTO supervisor_user_id
  FROM timesheet_approvals ta
  JOIN employees e ON e.id = ta.supervisor_approved_by
  LEFT JOIN profiles p ON p.employee_id = e.id
  WHERE ta.employee_id = p_employee_id
    AND ta.pay_period_start = p_start_date
    AND ta.pay_period_end = p_end_date;
  
  -- Get employee user_id
  SELECT p.user_id INTO employee_user_id
  FROM profiles p
  WHERE p.employee_id = p_employee_id;
  
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
  
  -- Create notification for supervisor
  IF supervisor_user_id IS NOT NULL THEN
    PERFORM create_notification(
      supervisor_user_id,
      'Timesheet finalized',
      'Timecard for ' || employee_record.first_name || ' ' || employee_record.last_name || 
        ' (' || to_char(p_start_date, 'Mon DD') || '–' || to_char(p_end_date, 'Mon DD, YYYY') || 
        ') has been finalized by Payroll/HR.',
      'final_approval',
      'timesheet_approval',
      approval_id,
      jsonb_build_object(
        'employee_id', p_employee_id,
        'employee_name', employee_record.first_name || ' ' || employee_record.last_name,
        'period_start', p_start_date,
        'period_end', p_end_date
      ),
      '/timecard/' || employee_record.employee_number || '?start=' || p_start_date || '&end=' || p_end_date
    );
  END IF;
  
  -- Create notification for employee
  IF employee_user_id IS NOT NULL THEN
    PERFORM create_notification(
      employee_user_id,
      'Timesheet finalized',
      'Your timecard for ' || to_char(p_start_date, 'Mon DD') || '–' || to_char(p_end_date, 'Mon DD, YYYY') || 
        ' has been finalized by Payroll/HR.',
      'final_approval',
      'timesheet_approval',
      approval_id,
      jsonb_build_object(
        'employee_id', p_employee_id,
        'period_start', p_start_date,
        'period_end', p_end_date
      ),
      '/timecard/' || employee_record.employee_number || '?start=' || p_start_date || '&end=' || p_end_date
    );
  END IF;
  
  -- Trigger email notification
  PERFORM pg_notify('timesheet_final_approved', json_build_object(
    'approval_id', approval_id,
    'employee_id', p_employee_id,
    'employee_name', employee_record.first_name || ' ' || employee_record.last_name,
    'company_id', user_profile.company_id,
    'period_start', p_start_date,
    'period_end', p_end_date,
    'supervisor_user_id', supervisor_user_id,
    'employee_user_id', employee_user_id
  )::text);
  
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