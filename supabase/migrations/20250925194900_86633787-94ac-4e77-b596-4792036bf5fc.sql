-- Create Organization Admin profile for the requested user if missing
INSERT INTO public.profiles (
  user_id,
  email,
  first_name,
  last_name,
  role,
  is_active,
  company_id
) VALUES (
  'af1fe550-d84d-459d-b1ab-31ebf5b4b969',
  'rusulkassim86@gmail.com',
  'Rusul',
  'Kassim',
  'org_admin',
  true,
  '123e4567-e89b-12d3-a456-426614174000'
)
ON CONFLICT DO NOTHING;