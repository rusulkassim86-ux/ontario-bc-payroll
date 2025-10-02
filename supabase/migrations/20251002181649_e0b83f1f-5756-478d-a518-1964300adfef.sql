-- Ensure pay_cycles has all required columns
DO $$ 
BEGIN
  -- Add missing columns to pay_cycles if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pay_cycles' AND column_name = 'period_start') THEN
    ALTER TABLE pay_cycles ADD COLUMN period_start DATE NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'pay_cycles' AND column_name = 'period_end') THEN
    ALTER TABLE pay_cycles ADD COLUMN period_end DATE NOT NULL;
  END IF;
END $$;

-- Create payroll_cycle_status table to track processing
CREATE TABLE IF NOT EXISTS payroll_cycle_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_cycle_id UUID NOT NULL REFERENCES pay_cycles(id) ON DELETE CASCADE,
  company_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, processed, posted
  total_employees INTEGER DEFAULT 0,
  processed_employees INTEGER DEFAULT 0,
  total_hours NUMERIC(10,2) DEFAULT 0,
  total_gross NUMERIC(12,2) DEFAULT 0,
  total_net NUMERIC(12,2) DEFAULT 0,
  locked_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  posted_to_gl_at TIMESTAMP WITH TIME ZONE,
  error_log JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pay_cycle_id, company_code)
);

-- Enable RLS
ALTER TABLE payroll_cycle_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payroll_cycle_status
CREATE POLICY "Company members can view cycle status"
  ON payroll_cycle_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.company_id IN (
        SELECT id FROM companies WHERE id = get_current_user_company()
      )
    )
  );

CREATE POLICY "Payroll admins can manage cycle status"
  ON payroll_cycle_status FOR ALL
  USING (
    get_current_user_role() IN ('org_admin', 'payroll_admin')
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.company_id = get_current_user_company()
    )
  );

-- Function to start payroll processing for a cycle
CREATE OR REPLACE FUNCTION start_payroll_processing(
  p_pay_cycle_id UUID,
  p_company_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_id UUID;
  v_employee_count INTEGER;
BEGIN
  -- Check permissions
  IF get_current_user_role() NOT IN ('org_admin', 'payroll_admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to process payroll';
  END IF;
  
  -- Count employees for this company
  SELECT COUNT(*) INTO v_employee_count
  FROM employees e
  WHERE e.company_code = p_company_code
  AND e.status = 'active';
  
  -- Create or update status record
  INSERT INTO payroll_cycle_status (
    pay_cycle_id,
    company_code,
    status,
    total_employees,
    processed_by
  ) VALUES (
    p_pay_cycle_id,
    p_company_code,
    'in_progress',
    v_employee_count,
    auth.uid()
  )
  ON CONFLICT (pay_cycle_id, company_code)
  DO UPDATE SET
    status = 'in_progress',
    processed_employees = 0,
    total_hours = 0,
    total_gross = 0,
    total_net = 0,
    processed_by = auth.uid(),
    updated_at = now()
  RETURNING id INTO v_status_id;
  
  -- Create audit log
  PERFORM create_audit_log(
    'START_PAYROLL_PROCESSING',
    'payroll_cycle_status',
    v_status_id,
    NULL,
    jsonb_build_object(
      'pay_cycle_id', p_pay_cycle_id,
      'company_code', p_company_code,
      'employee_count', v_employee_count
    )
  );
  
  RETURN v_status_id;
END;
$$;

-- Function to complete payroll processing
CREATE OR REPLACE FUNCTION complete_payroll_processing(
  p_status_id UUID,
  p_total_hours NUMERIC,
  p_total_gross NUMERIC,
  p_total_net NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay_cycle_id UUID;
  v_company_code TEXT;
BEGIN
  -- Get cycle info
  SELECT pay_cycle_id, company_code
  INTO v_pay_cycle_id, v_company_code
  FROM payroll_cycle_status
  WHERE id = p_status_id;
  
  -- Update status
  UPDATE payroll_cycle_status
  SET
    status = 'processed',
    total_hours = p_total_hours,
    total_gross = p_total_gross,
    total_net = p_total_net,
    processed_at = now(),
    locked_at = now(),
    updated_at = now()
  WHERE id = p_status_id;
  
  -- Lock all timesheets for this cycle
  UPDATE timesheets
  SET
    locked_at = now(),
    status = 'processed',
    updated_at = now()
  WHERE pay_calendar_id = v_pay_cycle_id
  AND company_code = v_company_code;
  
  -- Create audit log
  PERFORM create_audit_log(
    'COMPLETE_PAYROLL_PROCESSING',
    'payroll_cycle_status',
    p_status_id,
    NULL,
    jsonb_build_object(
      'total_hours', p_total_hours,
      'total_gross', p_total_gross,
      'total_net', p_total_net
    )
  );
END;
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payroll_cycle_status_cycle ON payroll_cycle_status(pay_cycle_id);
CREATE INDEX IF NOT EXISTS idx_payroll_cycle_status_company ON payroll_cycle_status(company_code);
CREATE INDEX IF NOT EXISTS idx_payroll_cycle_status_status ON payroll_cycle_status(status);