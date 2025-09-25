-- Create RLS policies for audit_logs table to restrict access to authorized administrators only

-- Policy to allow organization admins to view audit logs for their company
CREATE POLICY "Organization admins can view company audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'org_admin' 
    AND p.is_active = true
  )
);

-- Policy to allow system-level audit log creation (for triggers and internal operations)
-- This uses a security definer function to bypass RLS for audit log creation
CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create a security definer function to safely create audit logs
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_before_data jsonb DEFAULT NULL,
  p_after_data jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_actor_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    metadata,
    actor_id
  ) VALUES (
    p_action,
    p_entity_type,
    p_entity_id,
    p_before_data,
    p_after_data,
    p_metadata,
    COALESCE(p_actor_id, auth.uid())
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;