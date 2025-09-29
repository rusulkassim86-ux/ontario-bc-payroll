-- Create CRA audit table for tracking API operations
CREATE TABLE public.cra_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('calc', 't4', 'roe')),
  request_data JSONB NOT NULL DEFAULT '{}',
  response_meta JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  duration_ms INTEGER NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cra_audit ENABLE ROW LEVEL SECURITY;

-- Create policies for CRA audit
CREATE POLICY "Company members can view CRA audit logs" 
ON public.cra_audit 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM employees e 
  WHERE e.id = cra_audit.employee_id 
  AND get_current_user_company() = e.company_id
));

CREATE POLICY "System can insert CRA audit logs" 
ON public.cra_audit 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_cra_audit_updated_at
BEFORE UPDATE ON public.cra_audit
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();