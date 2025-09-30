-- Create T4 paycode mapping table
CREATE TABLE IF NOT EXISTS public.t4_paycode_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_code TEXT NOT NULL CHECK (company_code IN ('OZC', '72R', '72S')),
  item_type TEXT NOT NULL CHECK (item_type IN ('EARNING', 'DEDUCTION', 'BENEFIT', 'TAX')),
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  contributes_box14 BOOLEAN NOT NULL DEFAULT true,
  insurable_ei BOOLEAN NOT NULL DEFAULT true,
  pensionable_cpp BOOLEAN NOT NULL DEFAULT true,
  cra_box_code TEXT CHECK (cra_box_code IN ('14', '16', '18', '20', '22', '24', '26', '40', '44', '') OR cra_box_code IS NULL),
  cra_other_info TEXT,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_code, item_code, version)
);

-- Create index for performance
CREATE INDEX idx_t4_mapping_company_active ON public.t4_paycode_mapping(company_code, is_active);
CREATE INDEX idx_t4_mapping_company_item ON public.t4_paycode_mapping(company_code, item_code);

-- Enable RLS
ALTER TABLE public.t4_paycode_mapping ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Company members can view T4 mappings"
ON public.t4_paycode_mapping
FOR SELECT
TO authenticated
USING (
  get_current_user_company() = company_id
);

CREATE POLICY "Payroll admins can manage T4 mappings"
ON public.t4_paycode_mapping
FOR ALL
TO authenticated
USING (
  get_current_user_role() IN ('org_admin', 'payroll_admin')
  AND get_current_user_company() = company_id
);

-- Add updated_at trigger
CREATE TRIGGER update_t4_paycode_mapping_updated_at
  BEFORE UPDATE ON public.t4_paycode_mapping
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit log function for T4 mapping changes
CREATE OR REPLACE FUNCTION public.log_t4_mapping_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_audit_log(
      'CREATE_T4_MAPPING',
      't4_paycode_mapping',
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM create_audit_log(
      'UPDATE_T4_MAPPING',
      't4_paycode_mapping',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      'DELETE_T4_MAPPING',
      't4_paycode_mapping',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER t4_mapping_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.t4_paycode_mapping
  FOR EACH ROW
  EXECUTE FUNCTION public.log_t4_mapping_change();