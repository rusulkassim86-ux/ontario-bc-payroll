-- Fix Security Definer View: Remove SECURITY DEFINER from v_punch_hours
-- and make it a regular view (security is handled by RLS on underlying tables)
DROP VIEW IF EXISTS public.v_punch_hours;

CREATE VIEW public.v_punch_hours AS
WITH punch_pairs AS (
  SELECT 
    p_in.employee_id,
    p_in.punch_timestamp::date AS work_date,
    p_in.punch_timestamp AS punch_in,
    p_out.punch_timestamp AS punch_out,
    EXTRACT(EPOCH FROM (p_out.punch_timestamp - p_in.punch_timestamp)) / 3600.0 AS hours
  FROM public.punches p_in
  JOIN public.punches p_out 
    ON p_in.employee_id = p_out.employee_id
    AND p_in.punch_timestamp::date = p_out.punch_timestamp::date
    AND p_in.direction = 'in'
    AND p_out.direction = 'out'
    AND p_out.punch_timestamp > p_in.punch_timestamp
  WHERE p_in.processed = true AND p_out.processed = true
)
SELECT
  employee_id,
  work_date,
  SUM(hours)::NUMERIC(6,2) AS punch_hours
FROM punch_pairs
GROUP BY employee_id, work_date;

-- Add comment explaining this view
COMMENT ON VIEW public.v_punch_hours IS 'Calculates daily hours from punch pairs. Security is handled by RLS on underlying punches table.';

-- Update existing functions that lack search_path setting
-- These are older functions that need to be updated

-- Fix apply_deduction_code_rules trigger function
CREATE OR REPLACE FUNCTION public.apply_deduction_code_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Handle 72S code: set union to UNIFOR
  IF NEW.deduction_code = '72S' THEN
    UPDATE employees 
    SET union_type = 'UNIFOR'
    WHERE id = NEW.employee_id;
  END IF;
  
  -- Handle OZC code: set group to Kitsault and province to BC
  IF NEW.deduction_code = 'OZC' THEN
    UPDATE employees 
    SET employee_group = 'Kitsault',
        province_code = 'BC'
    WHERE id = NEW.employee_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix log_t4_mapping_change trigger function
CREATE OR REPLACE FUNCTION public.log_t4_mapping_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix validate_work_permit_data trigger function
CREATE OR REPLACE FUNCTION public.validate_work_permit_data()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
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
$function$;