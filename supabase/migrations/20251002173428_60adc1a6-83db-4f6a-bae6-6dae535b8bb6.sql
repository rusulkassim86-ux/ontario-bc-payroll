-- Add GL account mapping to earning and deduction codes
ALTER TABLE earning_codes ADD COLUMN IF NOT EXISTS gl_account TEXT;
ALTER TABLE earning_codes ADD COLUMN IF NOT EXISTS gl_debit_credit TEXT CHECK (gl_debit_credit IN ('debit', 'credit'));
ALTER TABLE earning_codes ADD COLUMN IF NOT EXISTS gl_department TEXT;

ALTER TABLE deduction_codes ADD COLUMN IF NOT EXISTS gl_account TEXT;
ALTER TABLE deduction_codes ADD COLUMN IF NOT EXISTS gl_debit_credit TEXT CHECK (gl_debit_credit IN ('debit', 'credit'));
ALTER TABLE deduction_codes ADD COLUMN IF NOT EXISTS gl_department TEXT;

-- Create GL account reference table for standard accounts
CREATE TABLE IF NOT EXISTS gl_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, account_code)
);

-- Enable RLS
ALTER TABLE gl_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for gl_accounts
CREATE POLICY "Company members can view GL accounts"
  ON gl_accounts FOR SELECT
  USING (get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage GL accounts"
  ON gl_accounts FOR ALL
  USING (
    get_current_user_role() IN ('org_admin', 'payroll_admin') 
    AND get_current_user_company() = company_id
  );

-- Create index
CREATE INDEX IF NOT EXISTS idx_gl_accounts_company ON gl_accounts(company_id);

-- Insert standard GL accounts for payroll
INSERT INTO gl_accounts (company_id, account_code, account_name, account_type, normal_balance)
SELECT c.id, '8000', 'Salaries & Wages', 'expense', 'debit'
FROM companies c
ON CONFLICT (company_id, account_code) DO NOTHING;

INSERT INTO gl_accounts (company_id, account_code, account_name, account_type, normal_balance)
SELECT c.id, '8055', 'Vacation Pay', 'expense', 'debit'
FROM companies c
ON CONFLICT (company_id, account_code) DO NOTHING;

INSERT INTO gl_accounts (company_id, account_code, account_name, account_type, normal_balance)
SELECT c.id, '8010', 'Bonus', 'expense', 'debit'
FROM companies c
ON CONFLICT (company_id, account_code) DO NOTHING;

INSERT INTO gl_accounts (company_id, account_code, account_name, account_type, normal_balance)
SELECT c.id, '8030', 'CPP/EI Employer', 'expense', 'debit'
FROM companies c
ON CONFLICT (company_id, account_code) DO NOTHING;

INSERT INTO gl_accounts (company_id, account_code, account_name, account_type, normal_balance)
SELECT c.id, '2047', 'Union Dues Payable', 'liability', 'credit'
FROM companies c
ON CONFLICT (company_id, account_code) DO NOTHING;

INSERT INTO gl_accounts (company_id, account_code, account_name, account_type, normal_balance)
SELECT c.id, '2042', 'DPSP Payable', 'liability', 'credit'
FROM companies c
ON CONFLICT (company_id, account_code) DO NOTHING;

INSERT INTO gl_accounts (company_id, account_code, account_name, account_type, normal_balance)
SELECT c.id, '2045', 'CPP Payable', 'liability', 'credit'
FROM companies c
ON CONFLICT (company_id, account_code) DO NOTHING;

INSERT INTO gl_accounts (company_id, account_code, account_name, account_type, normal_balance)
SELECT c.id, '2046', 'EI Payable', 'liability', 'credit'
FROM companies c
ON CONFLICT (company_id, account_code) DO NOTHING;

INSERT INTO gl_accounts (company_id, account_code, account_name, account_type, normal_balance)
SELECT c.id, '2048', 'Tax Payable', 'liability', 'credit'
FROM companies c
ON CONFLICT (company_id, account_code) DO NOTHING;

INSERT INTO gl_accounts (company_id, account_code, account_name, account_type, normal_balance)
SELECT c.id, '110', 'Bank - Payroll', 'asset', 'debit'
FROM companies c
ON CONFLICT (company_id, account_code) DO NOTHING;