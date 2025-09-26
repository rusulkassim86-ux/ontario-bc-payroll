-- Fix function search path security issue by setting search_path for all functions
ALTER FUNCTION public.check_work_permit_expiry() SET search_path = public;