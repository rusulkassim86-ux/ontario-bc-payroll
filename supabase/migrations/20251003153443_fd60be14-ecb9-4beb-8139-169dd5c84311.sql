-- Add pay_period_number to pay_cycles if missing
ALTER TABLE pay_cycles ADD COLUMN IF NOT EXISTS pay_period_number INTEGER;

-- Make payroll_in_date nullable (was causing NOT NULL violations)
ALTER TABLE pay_cycles ALTER COLUMN payroll_in_date DROP NOT NULL;

-- Drop old unique constraint and create new one for ADP format
DROP INDEX IF EXISTS uniq_pay_cycle;
CREATE UNIQUE INDEX uniq_pay_cycle_adp ON pay_cycles(company_code, pay_period_number, period_end);

-- Add period_start and period_end columns to timesheets (in addition to pay_period_start/pay_period_end)
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS pay_period_number INTEGER;

-- Drop and recreate unique index for timesheets
DROP INDEX IF EXISTS idx_timesheet_employee_period;
CREATE UNIQUE INDEX idx_timesheet_employee_period 
ON timesheets(employee_id, pay_period_number, period_end) 
WHERE pay_period_number IS NOT NULL;

-- Update trigger to use pay_period_number and fix upsert logic
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
     (TG_OP = 'UPDATE' AND (OLD.period_start IS DISTINCT FROM NEW.period_start OR OLD.period_end IS DISTINCT FROM NEW.period_end)) THEN
    
    -- Map company_code to employee_group
    emp_group := CASE 
      WHEN NEW.company_code = '72S' THEN '72S'
      WHEN NEW.company_code = '72R' THEN '72R'
      WHEN NEW.company_code = 'OZC' THEN 'Kitsault'
      ELSE NEW.company_code
    END;
    
    -- Create/update timesheets for all active employees
    FOR emp_record IN 
      SELECT e.id
      FROM employees e
      WHERE e.employee_group = emp_group
        AND e.status = 'active'
    LOOP
      -- Only insert if pay_period_number is set
      IF NEW.pay_period_number IS NOT NULL THEN
        INSERT INTO timesheets (
          employee_id,
          company_code,
          period_start,
          period_end,
          pay_period_start,
          pay_period_end,
          pay_period_number,
          pay_calendar_id,
          status,
          source
        ) VALUES (
          emp_record.id,
          NEW.company_code,
          NEW.period_start,
          NEW.period_end,
          NEW.period_start,
          NEW.period_end,
          NEW.pay_period_number,
          NEW.id,
          'pending',
          'auto_generated'
        )
        ON CONFLICT (employee_id, pay_period_number, period_end) 
        DO UPDATE SET
          period_start = EXCLUDED.period_start,
          period_end = EXCLUDED.period_end,
          pay_period_start = EXCLUDED.pay_period_start,
          pay_period_end = EXCLUDED.pay_period_end,
          pay_calendar_id = EXCLUDED.pay_calendar_id,
          updated_at = NOW()
        WHERE timesheets.status NOT IN ('approved', 'locked', 'processed');
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_auto_create_timesheets ON pay_cycles;
CREATE TRIGGER trigger_auto_create_timesheets
  AFTER INSERT OR UPDATE ON pay_cycles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_timesheets_for_cycle();