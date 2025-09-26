-- Extend employees table with new hire compliance fields
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS fte_hours_per_week numeric DEFAULT 40;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS reports_to_id uuid REFERENCES public.employees(id);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS gl_cost_center text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS overtime_eligible boolean DEFAULT true;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS ot_multiplier numeric DEFAULT 1.5;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS vacation_policy_id uuid;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS seniority_date date;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS work_eligibility text CHECK (work_eligibility IN ('Citizen', 'PR', 'WorkPermit', 'Other'));
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS permit_expiry date;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS td1_federal_status text DEFAULT 'Pending' CHECK (td1_federal_status IN ('Pending', 'Received'));
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS td1_provincial_status text DEFAULT 'Pending' CHECK (td1_provincial_status IN ('Pending', 'Received'));
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS probation_end date;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS company_code text DEFAULT '72R';

-- Create vacation_policies table
CREATE TABLE IF NOT EXISTS public.vacation_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  accrual_rate_pct numeric NOT NULL,
  carryover_rules jsonb DEFAULT '{}',
  company_id uuid REFERENCES public.companies(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create employee_contacts table
CREATE TABLE IF NOT EXISTS public.employee_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('primary', 'secondary')),
  name text NOT NULL,
  relationship text NOT NULL,
  phone text NOT NULL,
  email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create employee_documents table
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('TD1_Federal', 'TD1_Provincial', 'Work_Permit', 'Offer_Letter', 'Policy_Ack', 'ID')),
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamp with time zone DEFAULT now(),
  downloaded_count integer DEFAULT 0,
  last_downloaded_at timestamp with time zone,
  last_downloaded_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create work_permit_reminders table for tracking expiry notifications
CREATE TABLE IF NOT EXISTS public.work_permit_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('30_days', '7_days', '1_day')),
  sent_at timestamp with time zone DEFAULT now(),
  permit_expiry date NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Add foreign key constraint for vacation_policy_id
ALTER TABLE public.employees ADD CONSTRAINT fk_employees_vacation_policy 
FOREIGN KEY (vacation_policy_id) REFERENCES public.vacation_policies(id);

-- Enable RLS on new tables
ALTER TABLE public.vacation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_permit_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for vacation_policies
CREATE POLICY "Company members can view vacation policies" 
ON public.vacation_policies FOR SELECT 
USING (get_current_user_company() = company_id);

CREATE POLICY "Payroll admins can manage vacation policies" 
ON public.vacation_policies FOR ALL 
USING ((get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text])) AND (get_current_user_company() = company_id));

-- RLS policies for employee_contacts
CREATE POLICY "Company members can view employee contacts" 
ON public.employee_contacts FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM employees e 
  WHERE e.id = employee_contacts.employee_id 
  AND get_current_user_company() = e.company_id
));

CREATE POLICY "Employees can view their own contacts" 
ON public.employee_contacts FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM employees e 
  WHERE e.id = employee_contacts.employee_id 
  AND e.id = get_current_user_employee_id()
));

CREATE POLICY "Payroll admins can manage employee contacts" 
ON public.employee_contacts FOR ALL 
USING ((get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text])) AND EXISTS (
  SELECT 1 FROM employees e 
  WHERE e.id = employee_contacts.employee_id 
  AND get_current_user_company() = e.company_id
));

-- RLS policies for employee_documents (highly restricted)
CREATE POLICY "Payroll admins can manage employee documents" 
ON public.employee_documents FOR ALL 
USING ((get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text])) AND EXISTS (
  SELECT 1 FROM employees e 
  WHERE e.id = employee_documents.employee_id 
  AND get_current_user_company() = e.company_id
));

CREATE POLICY "Employees can view their own documents" 
ON public.employee_documents FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM employees e 
  WHERE e.id = employee_documents.employee_id 
  AND e.id = get_current_user_employee_id()
));

-- RLS policies for work_permit_reminders
CREATE POLICY "Payroll admins can manage permit reminders" 
ON public.work_permit_reminders FOR ALL 
USING ((get_current_user_role() = ANY (ARRAY['org_admin'::text, 'payroll_admin'::text])) AND EXISTS (
  SELECT 1 FROM employees e 
  WHERE e.id = work_permit_reminders.employee_id 
  AND get_current_user_company() = e.company_id
));

-- Create triggers for updated_at columns
CREATE TRIGGER update_vacation_policies_updated_at 
BEFORE UPDATE ON public.vacation_policies 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_contacts_updated_at 
BEFORE UPDATE ON public.employee_contacts 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_documents_updated_at 
BEFORE UPDATE ON public.employee_documents 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default vacation policies
INSERT INTO public.vacation_policies (name, accrual_rate_pct, carryover_rules, company_id) 
SELECT 'Standard 4%', 4.0, '{"max_carryover_days": 10, "carryover_expiry_months": 12}', id 
FROM public.companies 
WHERE NOT EXISTS (SELECT 1 FROM public.vacation_policies WHERE name = 'Standard 4%');

-- Create function to check work permit expiry and send reminders
CREATE OR REPLACE FUNCTION public.check_work_permit_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_record RECORD;
  reminder_days INTEGER[] := ARRAY[30, 7, 1];
  reminder_type TEXT;
  day_count INTEGER;
BEGIN
  -- Check for permits expiring in 30, 7, or 1 days
  FOR day_count IN SELECT unnest(reminder_days) LOOP
    FOR emp_record IN 
      SELECT e.id, e.first_name, e.last_name, e.employee_number, e.permit_expiry, e.company_id
      FROM employees e
      WHERE e.work_eligibility = 'WorkPermit'
      AND e.permit_expiry IS NOT NULL
      AND e.permit_expiry = CURRENT_DATE + day_count
      AND NOT EXISTS (
        SELECT 1 FROM work_permit_reminders wpr 
        WHERE wpr.employee_id = e.id 
        AND wpr.reminder_type = day_count || '_days'
        AND wpr.permit_expiry = e.permit_expiry
      )
    LOOP
      -- Insert reminder record
      INSERT INTO work_permit_reminders (employee_id, reminder_type, permit_expiry)
      VALUES (emp_record.id, day_count || '_days', emp_record.permit_expiry);
      
      -- Log audit entry
      PERFORM create_audit_log(
        'WORK_PERMIT_EXPIRY_REMINDER',
        'employee',
        emp_record.id,
        NULL,
        jsonb_build_object(
          'employee_name', emp_record.first_name || ' ' || emp_record.last_name,
          'employee_number', emp_record.employee_number,
          'permit_expiry', emp_record.permit_expiry,
          'days_until_expiry', day_count,
          'reminder_type', day_count || '_days'
        )
      );
    END LOOP;
  END LOOP;
END;
$$;

-- Function to validate work permit requirements
CREATE OR REPLACE FUNCTION public.validate_work_permit_data()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If work eligibility is WorkPermit, permit_expiry is required and must be in future
  IF NEW.work_eligibility = 'WorkPermit' THEN
    IF NEW.permit_expiry IS NULL THEN
      RAISE EXCEPTION 'Permit expiry date is required for work permit holders';
    END IF;
    
    IF NEW.permit_expiry <= CURRENT_DATE THEN
      RAISE EXCEPTION 'Permit expiry date must be in the future';
    END IF;
  END IF;
  
  -- Set default probation end date if not provided
  IF NEW.probation_end IS NULL AND NEW.hire_date IS NOT NULL THEN
    NEW.probation_end := NEW.hire_date + INTERVAL '90 days';
  END IF;
  
  -- Set default seniority date if not provided
  IF NEW.seniority_date IS NULL AND NEW.hire_date IS NOT NULL THEN
    NEW.seniority_date := NEW.hire_date;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for work permit validation
CREATE TRIGGER validate_employee_work_permit 
BEFORE INSERT OR UPDATE ON public.employees 
FOR EACH ROW EXECUTE FUNCTION public.validate_work_permit_data();

-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for employee documents (private bucket)
CREATE POLICY "Payroll admins can upload employee documents" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'employee-documents' 
  AND (auth.jwt() ->> 'role')::text = ANY (ARRAY['org_admin', 'payroll_admin'])
);

CREATE POLICY "Payroll admins can view employee documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'employee-documents' 
  AND (auth.jwt() ->> 'role')::text = ANY (ARRAY['org_admin', 'payroll_admin'])
);

CREATE POLICY "Employees can view their own documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'employee-documents' 
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'employee_id')::text
);