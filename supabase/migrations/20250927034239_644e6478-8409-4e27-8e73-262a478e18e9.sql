-- Fix search_path for security
CREATE OR REPLACE FUNCTION public.generate_roe_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  sequence_num TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Get next sequence number for this year
  SELECT LPAD((COUNT(*) + 1)::TEXT, 6, '0')
  INTO sequence_num
  FROM public.roe_slips 
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  RETURN 'ROE' || current_year || sequence_num;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_cra_taxes(
  gross_income NUMERIC,
  pay_periods_per_year INTEGER,
  jurisdiction TEXT,
  tax_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  annual_income NUMERIC;
  pay_period_income NUMERIC;
  tax_amount NUMERIC := 0;
  tax_record RECORD;
BEGIN
  -- Convert to annual income for tax calculation
  annual_income := gross_income * pay_periods_per_year;
  
  -- Find applicable tax bracket
  SELECT tax_amount INTO tax_amount
  FROM public.cra_tax_tables
  WHERE jurisdiction = calculate_cra_taxes.jurisdiction
    AND tax_year = calculate_cra_taxes.tax_year
    AND pay_period_type = CASE pay_periods_per_year
        WHEN 52 THEN 'weekly'
        WHEN 26 THEN 'biweekly'
        WHEN 24 THEN 'semimonthly'
        WHEN 12 THEN 'monthly'
        ELSE 'biweekly'
      END
    AND gross_income >= income_from 
    AND gross_income < income_to
    AND is_active = true
  ORDER BY income_from DESC
  LIMIT 1;
  
  RETURN COALESCE(tax_amount, 0);
END;
$$;