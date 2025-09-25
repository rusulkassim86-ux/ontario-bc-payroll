-- Create employee balances table for PTO and banked time tracking
CREATE TABLE public.employee_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  balance_type TEXT NOT NULL CHECK (balance_type IN ('vacation', 'sick', 'personal', 'bereavement', 'float', 'banked_time')),
  current_balance NUMERIC NOT NULL DEFAULT 0,
  accrued_balance NUMERIC NOT NULL DEFAULT 0,
  used_balance NUMERIC NOT NULL DEFAULT 0,
  policy_annual_accrual NUMERIC,
  policy_max_carryover NUMERIC,
  policy_max_balance NUMERIC,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, balance_type, effective_date)
);

-- Create balance transactions table for audit trail
CREATE TABLE public.balance_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  balance_type TEXT NOT NULL CHECK (balance_type IN ('vacation', 'sick', 'personal', 'bereavement', 'float', 'banked_time')),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('accrual', 'usage', 'adjustment', 'carryover')),
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  reference_date DATE NOT NULL,
  reference_type TEXT, -- 'timesheet', 'payroll', 'manual_adjustment'
  reference_id UUID, -- timesheet_id, pay_run_id, etc.
  pay_code TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;

-- Employee balances policies
CREATE POLICY "Company members can view employee balances"
ON public.employee_balances
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = employee_id 
    AND get_current_user_company() = e.company_id
  )
);

CREATE POLICY "Payroll admins can manage employee balances"
ON public.employee_balances
FOR ALL
USING (
  get_current_user_role() = ANY(ARRAY['org_admin', 'payroll_admin']) 
  AND EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = employee_id 
    AND get_current_user_company() = e.company_id
  )
);

-- Balance transactions policies  
CREATE POLICY "Company members can view balance transactions"
ON public.balance_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = employee_id 
    AND get_current_user_company() = e.company_id
  )
);

CREATE POLICY "Payroll admins can manage balance transactions"
ON public.balance_transactions
FOR ALL
USING (
  get_current_user_role() = ANY(ARRAY['org_admin', 'payroll_admin']) 
  AND EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = employee_id 
    AND get_current_user_company() = e.company_id
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_employee_balances_updated_at
  BEFORE UPDATE ON public.employee_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add stackable flag to pay_codes table
ALTER TABLE public.pay_codes 
ADD COLUMN stackable BOOLEAN NOT NULL DEFAULT false;

-- Add employee base rate tracking
CREATE TABLE public.employee_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('hourly', 'salary', 'daily')),
  base_rate NUMERIC NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for employee rates
ALTER TABLE public.employee_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view employee rates"
ON public.employee_rates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = employee_id 
    AND get_current_user_company() = e.company_id
  )
);

CREATE POLICY "Payroll admins can manage employee rates"
ON public.employee_rates
FOR ALL
USING (
  get_current_user_role() = ANY(ARRAY['org_admin', 'payroll_admin']) 
  AND EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.id = employee_id 
    AND get_current_user_company() = e.company_id
  )
);

CREATE TRIGGER update_employee_rates_updated_at
  BEFORE UPDATE ON public.employee_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample employee rates for existing employees
INSERT INTO public.employee_rates (employee_id, rate_type, base_rate)
SELECT 
  e.id,
  'hourly',
  25.00
FROM employees e;

-- Insert sample balances for existing employees
INSERT INTO public.employee_balances (employee_id, balance_type, current_balance, accrued_balance, policy_annual_accrual, policy_max_carryover)
SELECT 
  e.id,
  'vacation',
  80.0,
  80.0,
  120.0,
  40.0
FROM employees e;

INSERT INTO public.employee_balances (employee_id, balance_type, current_balance, accrued_balance, policy_annual_accrual, policy_max_carryover)
SELECT 
  e.id,
  'sick',
  40.0,
  40.0,
  60.0,
  20.0
FROM employees e;

INSERT INTO public.employee_balances (employee_id, balance_type, current_balance, accrued_balance, policy_annual_accrual, policy_max_carryover)
SELECT 
  e.id,
  'banked_time',
  0.0,
  0.0,
  null,
  160.0
FROM employees e;