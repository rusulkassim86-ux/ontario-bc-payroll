-- Grant Organization Admin role to rusulkassim86@gmail.com
UPDATE public.profiles 
SET role = 'org_admin'
WHERE email = 'rusulkassim86@gmail.com';