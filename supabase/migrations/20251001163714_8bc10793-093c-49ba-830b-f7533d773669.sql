-- Map active earning pay codes to OZC company code
-- REG, OT, OT1, OT2, BONUS, SICK, VAC will be available for OZC

UPDATE public.pay_codes_master 
SET company_scope = 'OZC'
WHERE code IN ('REG', 'OT', 'OT1', 'OT2', 'BONUS', 'SICK', 'VAC')
AND is_active = true;

-- Set 72R and 72S scopes for future use (reserved)
UPDATE public.pay_codes_master 
SET company_scope = '72R'
WHERE company_scope = '72R' OR (code IN ('E06', 'E09', 'E11') AND company_scope != 'OZC');

UPDATE public.pay_codes_master 
SET company_scope = '72S'
WHERE company_scope = '72S' OR (code IN ('E29', 'E34', 'E08') AND company_scope != 'OZC');

-- Add comment explaining company code mapping
COMMENT ON COLUMN public.pay_codes_master.company_scope IS 'Company code mapping (OZC, 72R, 72S, or ALL for all companies)';