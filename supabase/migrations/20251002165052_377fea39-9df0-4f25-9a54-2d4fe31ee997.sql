-- Create pay_cycles table for storing pay cycle schedule data
CREATE TABLE IF NOT EXISTS public.pay_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  payroll_in_date DATE NOT NULL,
  payroll_out_date DATE NOT NULL,
  pay_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  deduction_groups TEXT,
  special_effects TEXT,
  report_groups TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_code, week_number, period_end_date)
);

-- Enable RLS
ALTER TABLE public.pay_cycles ENABLE ROW LEVEL SECURITY;

-- Company members can view pay cycles
CREATE POLICY "Company members can view pay cycles"
  ON public.pay_cycles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN companies c ON c.id = p.company_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Payroll admins can manage pay cycles
CREATE POLICY "Payroll admins can manage pay cycles"
  ON public.pay_cycles
  FOR ALL
  USING (
    get_current_user_role() IN ('org_admin', 'payroll_admin')
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pay_cycles_company_week 
  ON public.pay_cycles(company_code, week_number);

CREATE INDEX IF NOT EXISTS idx_pay_cycles_period_end 
  ON public.pay_cycles(period_end_date);

-- Add trigger for updated_at
CREATE TRIGGER update_pay_cycles_updated_at
  BEFORE UPDATE ON public.pay_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();