-- Add missing columns to timesheets for bi-weekly tracking
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS week1_hours NUMERIC(9,2) DEFAULT 0;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS week2_hours NUMERIC(9,2) DEFAULT 0;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(9,2) DEFAULT 0;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Ensure pay_cycles has all required columns
ALTER TABLE pay_cycles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Scheduled';

-- Update the unique constraint to match the upsert key
DROP INDEX IF EXISTS uniq_pay_cycle_adp;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pay_cycle_adp ON pay_cycles(company_code, pay_period_number, period_end);

-- Update timesheets unique constraint
DROP INDEX IF EXISTS idx_timesheet_employee_period;
CREATE UNIQUE INDEX IF NOT EXISTS idx_timesheet_employee_period ON timesheets(employee_id, company_code, pay_period_number, period_end);