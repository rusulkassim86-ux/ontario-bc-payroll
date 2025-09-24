-- User profiles and authentication system
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('org_admin', 'payroll_admin', 'manager', 'employee')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  permissions JSONB NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Company admins can view company profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id = profiles.company_id 
    AND p.role IN ('org_admin', 'payroll_admin')
  )
);

-- Create policies for companies (only company members can access)
CREATE POLICY "Company members can view their company" 
ON public.companies 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id = companies.id
  )
);

CREATE POLICY "Company admins can update their company" 
ON public.companies 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id = companies.id 
    AND p.role = 'org_admin'
  )
);

-- Create policies for worksites
CREATE POLICY "Company members can view worksites" 
ON public.worksites 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id = worksites.company_id
  )
);

CREATE POLICY "Company admins can manage worksites" 
ON public.worksites 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id = worksites.company_id 
    AND p.role IN ('org_admin', 'payroll_admin')
  )
);

-- Create policies for employees
CREATE POLICY "Company members can view employees" 
ON public.employees 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id = employees.company_id
  )
);

CREATE POLICY "Payroll admins can manage employees" 
ON public.employees 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id = employees.company_id 
    AND p.role IN ('org_admin', 'payroll_admin')
  )
);

-- Employees can view their own record
CREATE POLICY "Employees can view their own record" 
ON public.employees 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.employee_id = employees.id
  )
);

-- Create policies for timesheets
CREATE POLICY "Employees can manage their own timesheets" 
ON public.timesheets 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.employee_id = timesheets.employee_id
  )
);

CREATE POLICY "Managers and admins can view timesheets" 
ON public.timesheets 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    JOIN public.employees e ON e.id = timesheets.employee_id
    WHERE p.user_id = auth.uid() 
    AND p.company_id = e.company_id 
    AND p.role IN ('org_admin', 'payroll_admin', 'manager')
  )
);

-- Create trigger for profile timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for profiles
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX idx_profiles_employee_id ON public.profiles(employee_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);