-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Company members can view notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Admins can manage notification settings" ON public.notification_settings;

-- Recreate RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Recreate RLS policies for notification_settings
CREATE POLICY "Company members can view notification settings"
ON public.notification_settings FOR SELECT
USING (get_current_user_company() = company_id);

CREATE POLICY "Admins can manage notification settings"
ON public.notification_settings FOR ALL
USING (
  get_current_user_role() IN ('org_admin', 'payroll_admin') 
  AND get_current_user_company() = company_id
);