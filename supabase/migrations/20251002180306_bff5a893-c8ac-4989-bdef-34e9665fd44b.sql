-- Add missing columns to pay_cycles if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_cycles' AND column_name = 'in_date') THEN
    ALTER TABLE public.pay_cycles ADD COLUMN in_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_cycles' AND column_name = 'out_date') THEN
    ALTER TABLE public.pay_cycles ADD COLUMN out_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_cycles' AND column_name = 'deduction_groups') THEN
    ALTER TABLE public.pay_cycles ADD COLUMN deduction_groups JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_cycles' AND column_name = 'special_effects') THEN
    ALTER TABLE public.pay_cycles ADD COLUMN special_effects JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_cycles' AND column_name = 'report_groups') THEN
    ALTER TABLE public.pay_cycles ADD COLUMN report_groups JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_cycles' AND column_name = 'status') THEN
    ALTER TABLE public.pay_cycles ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_cycles' AND column_name = 'is_current') THEN
    ALTER TABLE public.pay_cycles ADD COLUMN is_current BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timesheets' AND column_name = 'pay_calendar_id') THEN
    ALTER TABLE public.timesheets ADD COLUMN pay_calendar_id UUID REFERENCES public.pay_cycles(id);
    CREATE INDEX idx_timesheets_pay_calendar ON public.timesheets(pay_calendar_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timesheets' AND column_name = 'company_code') THEN
    ALTER TABLE public.timesheets ADD COLUMN company_code TEXT;
    CREATE INDEX idx_timesheets_company_code ON public.timesheets(company_code);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pay_runs' AND column_name = 'pay_cycle_id') THEN
    ALTER TABLE public.pay_runs ADD COLUMN pay_cycle_id UUID REFERENCES public.pay_cycles(id);
    CREATE INDEX idx_pay_runs_pay_cycle ON public.pay_runs(pay_cycle_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pay_cycles_current ON public.pay_cycles(is_current) WHERE is_current = true;

CREATE OR REPLACE FUNCTION public.auto_create_timesheets_for_cycle()
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
    
    emp_group := CASE 
      WHEN NEW.company_code = '72S' THEN '72S'
      WHEN NEW.company_code = '72R' THEN '72R'
      WHEN NEW.company_code = 'OZC' THEN 'Kitsault'
      ELSE NEW.company_code
    END;
    
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

DROP TRIGGER IF EXISTS trigger_auto_create_timesheets ON public.pay_cycles;
CREATE TRIGGER trigger_auto_create_timesheets
  AFTER INSERT OR UPDATE ON public.pay_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_timesheets_for_cycle();

CREATE OR REPLACE FUNCTION public.get_current_pay_cycle(p_company_code TEXT)
RETURNS TABLE(
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