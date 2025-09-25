-- Create storage bucket for file imports
INSERT INTO storage.buckets (id, name, public) VALUES ('imports', 'imports', false);

-- Create RLS policies for imports bucket
CREATE POLICY "Authenticated users can upload import files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'imports' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their own import files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'imports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own import files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'imports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create import_logs table for tracking imports
CREATE TABLE public.import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  import_type TEXT NOT NULL CHECK (import_type IN ('pay_codes', 'employee_paycodes')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_rows INTEGER,
  processed_rows INTEGER,
  error_rows INTEGER,
  errors JSONB DEFAULT '[]'::jsonb,
  mapping JSONB,
  preview_data JSONB,
  imported_by UUID,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on import_logs
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view import logs"
ON public.import_logs
FOR SELECT
USING (get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage import logs"
ON public.import_logs
FOR ALL
USING (
  get_current_user_role() = ANY(ARRAY['org_admin', 'payroll_admin']) 
  AND get_current_user_company() = company_id
);

-- Create trigger for updated_at
CREATE TRIGGER update_import_logs_updated_at
  BEFORE UPDATE ON public.import_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();