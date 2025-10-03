-- Add unique constraint for pay_cycles
ALTER TABLE pay_cycles DROP CONSTRAINT IF EXISTS uniq_pay_cycle;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pay_cycle ON pay_cycles(company_code, week_number, period_end);

-- Update pay_cycles to ensure status column exists with default
ALTER TABLE pay_cycles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';

-- Create trigger to auto-create timesheets when pay_cycles are inserted/updated
CREATE OR REPLACE FUNCTION auto_create_timesheets_for_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_record RECORD;
  emp_group TEXT;
BEGIN
  IF (TG_OP = 'INSERT') OR 
     (TG_OP = 'UPDATE' AND (OLD.period_start != NEW.period_start OR OLD.period_end != NEW.period_end)) THEN
    
    -- Map company_code to employee_group
    emp_group := CASE 
      WHEN NEW.company_code = '72S' THEN '72S'
      WHEN NEW.company_code = '72R' THEN '72R'
      WHEN NEW.company_code = 'OZC' THEN 'Kitsault'
      ELSE NEW.company_code
    END;
    
    -- Create timesheets for all active employees in this group
    FOR emp_record IN 
      SELECT e.id
      FROM employees e
      WHERE e.employee_group = emp_group
        AND e.status = 'active'
    LOOP
      INSERT INTO timesheets (
        employee_id,
        company_code,
        pay_period_start,
        pay_period_end,
        pay_calendar_id,
        status,
        source
      ) VALUES (
        emp_record.id,
        NEW.company_code,
        NEW.period_start,
        NEW.period_end,
        NEW.id,
        'pending',
        'auto_generated'
      )
      ON CONFLICT (employee_id, pay_period_start, pay_period_end) 
      DO UPDATE SET
        pay_calendar_id = EXCLUDED.pay_calendar_id,
        company_code = EXCLUDED.company_code,
        updated_at = NOW()
      WHERE timesheets.status IN ('pending', 'draft');
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to pay_cycles
DROP TRIGGER IF EXISTS trigger_auto_create_timesheets ON pay_cycles;
CREATE TRIGGER trigger_auto_create_timesheets
  AFTER INSERT OR UPDATE ON pay_cycles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_timesheets_for_cycle();

-- Function to get current pay cycle for a company
CREATE OR REPLACE FUNCTION get_current_pay_cycle(p_company_code TEXT)
RETURNS TABLE (
  id UUID,
  company_code TEXT,
  week_number INTEGER,
  in_date DATE,
  out_date DATE,
  pay_date DATE,
  period_start DATE,
  period_end DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.company_code,
    pc.week_number,
    pc.in_date,
    pc.out_date,
    pc.pay_date,
    pc.period_start,
    pc.period_end
  FROM pay_cycles pc
  WHERE pc.company_code = p_company_code
    AND CURRENT_DATE BETWEEN pc.period_start AND pc.period_end
    AND pc.status = 'active'
  ORDER BY pc.period_start DESC
  LIMIT 1;
END;
$$;