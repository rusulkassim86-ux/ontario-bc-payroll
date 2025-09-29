-- Add missing fields to employees table for ADP-style Employee Profile
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS job_function TEXT,
ADD COLUMN IF NOT EXISTS worker_category TEXT,
ADD COLUMN IF NOT EXISTS pay_grade TEXT,
ADD COLUMN IF NOT EXISTS management_position BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS salary NUMERIC,
ADD COLUMN IF NOT EXISTS annual_salary NUMERIC,
ADD COLUMN IF NOT EXISTS pay_frequency TEXT DEFAULT 'biweekly',
ADD COLUMN IF NOT EXISTS rate2 NUMERIC,
ADD COLUMN IF NOT EXISTS standard_hours NUMERIC,
ADD COLUMN IF NOT EXISTS premium_rate_factor NUMERIC DEFAULT 1.5,
ADD COLUMN IF NOT EXISTS business_unit TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS benefits_eligibility_class TEXT,
ADD COLUMN IF NOT EXISTS union_code TEXT,
ADD COLUMN IF NOT EXISTS union_local TEXT,
ADD COLUMN IF NOT EXISTS home_department TEXT,
ADD COLUMN IF NOT EXISTS home_cost_number TEXT,
ADD COLUMN IF NOT EXISTS fte NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS assigned_shift TEXT DEFAULT 'Day Shift',
ADD COLUMN IF NOT EXISTS scheduled_hours NUMERIC DEFAULT 40,
ADD COLUMN IF NOT EXISTS accrual_date DATE,
ADD COLUMN IF NOT EXISTS default_start_time TEXT DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS default_request_hours NUMERIC DEFAULT 8.0,
ADD COLUMN IF NOT EXISTS position_start_date DATE,
ADD COLUMN IF NOT EXISTS rehire_date DATE,
ADD COLUMN IF NOT EXISTS leave_return_date DATE,
ADD COLUMN IF NOT EXISTS leave_return_reason TEXT,
ADD COLUMN IF NOT EXISTS rehire_reason TEXT;

-- Create additional earnings table
CREATE TABLE IF NOT EXISTS employee_additional_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  earning_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'one-time',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create custom fields table
CREATE TABLE IF NOT EXISTS employee_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  field_type TEXT DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE employee_additional_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_custom_fields ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for additional earnings
CREATE POLICY "Company members can view employee additional earnings"
  ON employee_additional_earnings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = employee_additional_earnings.employee_id 
    AND get_current_user_company() = e.company_id
  ));

CREATE POLICY "Payroll admins can manage employee additional earnings"
  ON employee_additional_earnings FOR ALL
  USING (
    get_current_user_role() = ANY(ARRAY['org_admin'::text, 'payroll_admin'::text]) AND
    EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.id = employee_additional_earnings.employee_id 
      AND get_current_user_company() = e.company_id
    )
  );

-- Create RLS policies for custom fields
CREATE POLICY "Company members can view employee custom fields"
  ON employee_custom_fields FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = employee_custom_fields.employee_id 
    AND get_current_user_company() = e.company_id
  ));

CREATE POLICY "Payroll admins can manage employee custom fields"
  ON employee_custom_fields FOR ALL
  USING (
    get_current_user_role() = ANY(ARRAY['org_admin'::text, 'payroll_admin'::text]) AND
    EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.id = employee_custom_fields.employee_id 
      AND get_current_user_company() = e.company_id
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_employee_additional_earnings_updated_at
  BEFORE UPDATE ON employee_additional_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_custom_fields_updated_at
  BEFORE UPDATE ON employee_custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();