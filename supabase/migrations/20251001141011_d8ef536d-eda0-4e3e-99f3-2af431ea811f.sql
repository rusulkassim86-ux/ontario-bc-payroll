-- Create payroll_items table (replaces pay_codes_master with new schema)
CREATE TABLE IF NOT EXISTS public.payroll_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code TEXT NOT NULL CHECK (company_code IN ('72R', '72S', 'OZC')),
  item_type TEXT NOT NULL CHECK (item_type IN ('Earning', 'Deduction', 'Benefit', 'Tax')),
  item_code TEXT NOT NULL,
  item_label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_code, item_code)
);

-- Create paycode_to_cra_gl table for CRA/GL mappings
CREATE TABLE IF NOT EXISTS public.paycode_to_cra_gl (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code TEXT NOT NULL CHECK (company_code IN ('72R', '72S', 'OZC')),
  item_code TEXT NOT NULL,
  cra_box_code TEXT,
  gl_account TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_code, item_code)
);

-- Enable RLS
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paycode_to_cra_gl ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payroll_items
CREATE POLICY "Company members can view payroll items"
  ON public.payroll_items FOR SELECT
  USING (get_current_user_company() IN (
    SELECT id FROM companies WHERE (
      company_code = payroll_items.company_code OR
      payroll_items.company_code IN ('72R', '72S', 'OZC')
    )
  ) OR true); -- Allow all authenticated users to view

CREATE POLICY "Payroll admins can manage payroll items"
  ON public.payroll_items FOR ALL
  USING (
    get_current_user_role() IN ('org_admin', 'payroll_admin')
  );

-- RLS Policies for paycode_to_cra_gl
CREATE POLICY "Company members can view CRA/GL mappings"
  ON public.paycode_to_cra_gl FOR SELECT
  USING (true); -- Allow all authenticated users to view

CREATE POLICY "Payroll admins can manage CRA/GL mappings"
  ON public.paycode_to_cra_gl FOR ALL
  USING (
    get_current_user_role() IN ('org_admin', 'payroll_admin')
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_items_company_code ON public.payroll_items(company_code);
CREATE INDEX IF NOT EXISTS idx_payroll_items_item_code ON public.payroll_items(item_code);
CREATE INDEX IF NOT EXISTS idx_paycode_to_cra_gl_company_code ON public.paycode_to_cra_gl(company_code);
CREATE INDEX IF NOT EXISTS idx_paycode_to_cra_gl_item_code ON public.paycode_to_cra_gl(item_code);

-- Trigger for updated_at
CREATE TRIGGER update_payroll_items_updated_at
  BEFORE UPDATE ON public.payroll_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_paycode_to_cra_gl_updated_at
  BEFORE UPDATE ON public.paycode_to_cra_gl
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();