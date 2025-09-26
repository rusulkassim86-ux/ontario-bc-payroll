-- Create punch system tables with RLS and foreign keys

-- Devices table for punch clocks
CREATE TABLE public.devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  serial_number text NOT NULL UNIQUE,
  location text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Toronto',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  last_heartbeat_at timestamp with time zone,
  webhook_secret text,
  allowed_ips text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  company_id uuid NOT NULL REFERENCES companies(id)
);

-- Enable RLS for devices
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Device employee mapping for badge to employee association
CREATE TABLE public.device_employees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_serial text NOT NULL,
  badge_id text NOT NULL,
  employee_id uuid NOT NULL REFERENCES employees(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(device_serial, badge_id),
  UNIQUE(employee_id, device_serial)
);

-- Enable RLS for device_employees
ALTER TABLE public.device_employees ENABLE ROW LEVEL SECURITY;

-- Punches table for storing all punch data
CREATE TABLE public.punches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_serial text NOT NULL,
  badge_id text NOT NULL,
  employee_id uuid REFERENCES employees(id),
  punch_timestamp timestamp with time zone NOT NULL,
  direction text NOT NULL CHECK (direction IN ('IN', 'OUT')),
  source text NOT NULL DEFAULT 'device' CHECK (source IN ('device', 'manual', 'import')),
  raw_data jsonb DEFAULT '{}',
  deduped_hash text,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  company_id uuid REFERENCES companies(id),
  UNIQUE(device_serial, badge_id, punch_timestamp, direction)
);

-- Enable RLS for punches
ALTER TABLE public.punches ENABLE ROW LEVEL SECURITY;

-- Add index for performance
CREATE INDEX idx_punches_employee_date ON public.punches(employee_id, punch_timestamp);
CREATE INDEX idx_punches_device_timestamp ON public.punches(device_serial, punch_timestamp);

-- Punch rules configuration per worksite
CREATE TABLE public.punch_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id),
  worksite_id uuid REFERENCES worksites(id),
  rounding_interval_minutes integer NOT NULL DEFAULT 1,
  grace_in_minutes integer NOT NULL DEFAULT 0,
  grace_out_minutes integer NOT NULL DEFAULT 0,
  duplicate_window_seconds integer NOT NULL DEFAULT 60,
  lunch_auto_minutes integer NOT NULL DEFAULT 0,
  daily_max_hours numeric NOT NULL DEFAULT 24,
  webhook_secret text,
  webhook_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, worksite_id)
);

-- Enable RLS for punch_config
ALTER TABLE public.punch_config ENABLE ROW LEVEL SECURITY;

-- Punch import log for tracking CSV/bulk imports
CREATE TABLE public.punch_import_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name text NOT NULL,
  import_type text NOT NULL DEFAULT 'csv' CHECK (import_type IN ('csv', 'webhook', 'manual')),
  imported_at timestamp with time zone NOT NULL DEFAULT now(),
  imported_by uuid REFERENCES auth.users(id),
  company_id uuid NOT NULL REFERENCES companies(id),
  rows_total integer NOT NULL DEFAULT 0,
  rows_success integer NOT NULL DEFAULT 0,
  rows_error integer NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]',
  summary jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed'))
);

-- Enable RLS for punch_import_logs
ALTER TABLE public.punch_import_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for devices
CREATE POLICY "Company members can view devices" 
ON public.devices 
FOR SELECT 
USING (get_current_user_company() = company_id);

CREATE POLICY "Admins can manage devices" 
ON public.devices 
FOR ALL 
USING (get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text]) AND get_current_user_company() = company_id);

-- RLS Policies for device_employees
CREATE POLICY "Company members can view device mappings" 
ON public.device_employees 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM employees e 
  WHERE e.id = device_employees.employee_id 
  AND get_current_user_company() = e.company_id
));

CREATE POLICY "Admins can manage device mappings" 
ON public.device_employees 
FOR ALL 
USING (get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text]) AND EXISTS (
  SELECT 1 FROM employees e 
  WHERE e.id = device_employees.employee_id 
  AND get_current_user_company() = e.company_id
));

-- RLS Policies for punches
CREATE POLICY "Employees can view their own punches" 
ON public.punches 
FOR SELECT 
USING (employee_id = get_current_user_employee_id());

CREATE POLICY "Company members can view company punches" 
ON public.punches 
FOR SELECT 
USING (get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text, 'manager'::text]) AND get_current_user_company() = company_id);

CREATE POLICY "System can insert punches" 
ON public.punches 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage punches" 
ON public.punches 
FOR ALL 
USING (get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text]) AND get_current_user_company() = company_id);

-- RLS Policies for punch_config
CREATE POLICY "Company members can view punch config" 
ON public.punch_config 
FOR SELECT 
USING (get_current_user_company() = company_id);

CREATE POLICY "Admins can manage punch config" 
ON public.punch_config 
FOR ALL 
USING (get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text]) AND get_current_user_company() = company_id);

-- RLS Policies for punch_import_logs
CREATE POLICY "Company members can view import logs" 
ON public.punch_import_logs 
FOR SELECT 
USING (get_current_user_company() = company_id);

CREATE POLICY "Admins can manage import logs" 
ON public.punch_import_logs 
FOR ALL 
USING (get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text]) AND get_current_user_company() = company_id);

-- Update trigger for updated_at columns
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_device_employees_updated_at
  BEFORE UPDATE ON public.device_employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_punch_config_updated_at
  BEFORE UPDATE ON public.punch_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert demo data
INSERT INTO public.devices (name, serial_number, location, company_id, webhook_secret) 
SELECT 
  'Front Door - Ottawa',
  '00JC835998',
  'Main Entrance',
  c.id,
  'webhook_secret_123'
FROM companies c
LIMIT 1;

-- Get the device serial and company for mapping
INSERT INTO public.device_employees (device_serial, badge_id, employee_id)
SELECT 
  '00JC835998',
  '10001',
  e.id
FROM employees e
WHERE e.employee_number = 'EMP001'
LIMIT 1;

-- Insert demo punches for today
INSERT INTO public.punches (device_serial, badge_id, employee_id, punch_timestamp, direction, company_id)
SELECT 
  '00JC835998',
  '10001',
  e.id,
  CURRENT_DATE + INTERVAL '8 hours',
  'IN',
  e.company_id
FROM employees e
WHERE e.employee_number = 'EMP001'
LIMIT 1;

INSERT INTO public.punches (device_serial, badge_id, employee_id, punch_timestamp, direction, company_id)
SELECT 
  '00JC835998',
  '10001',
  e.id,
  CURRENT_DATE + INTERVAL '17 hours',
  'OUT',
  e.company_id
FROM employees e
WHERE e.employee_number = 'EMP001'
LIMIT 1;

-- Insert default punch config
INSERT INTO public.punch_config (company_id, rounding_interval_minutes, grace_in_minutes, grace_out_minutes, webhook_secret)
SELECT 
  c.id,
  15,
  5,
  5,
  'webhook_secret_123'
FROM companies c
LIMIT 1;