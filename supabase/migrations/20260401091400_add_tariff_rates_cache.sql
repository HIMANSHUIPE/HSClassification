/*
  # Tariff Rates Cache Schema

  1. New Tables
    - tariff_rates: Stores cached duty rates from official sources
    - api_rate_limits: Tracks API usage to stay within free tier limits

  2. Indexes
    - Fast lookup by HS code and countries
    - Efficient filtering by expiry date

  3. Security
    - Enable RLS on both tables
    - Authenticated users can read tariff rates
    - Only service role can write rates
*/

-- Create tariff_rates table
CREATE TABLE IF NOT EXISTS tariff_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hs_code text NOT NULL,
  country_origin text NOT NULL,
  country_destination text NOT NULL,
  duty_rate numeric NOT NULL,
  duty_type text NOT NULL DEFAULT 'MFN',
  rate_unit text NOT NULL DEFAULT '%',
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  source text NOT NULL,
  source_url text,
  additional_duties jsonb DEFAULT '{}'::jsonb,
  notes text,
  last_verified timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create api_rate_limits table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name text UNIQUE NOT NULL,
  calls_made integer NOT NULL DEFAULT 0,
  calls_limit integer NOT NULL,
  reset_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tariff_rates_lookup 
  ON tariff_rates(hs_code, country_origin, country_destination);

CREATE INDEX IF NOT EXISTS idx_tariff_rates_expiry 
  ON tariff_rates(expiry_date) 
  WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tariff_rates_source 
  ON tariff_rates(source);

CREATE INDEX IF NOT EXISTS idx_tariff_rates_verified 
  ON tariff_rates(last_verified);

-- Enable RLS
ALTER TABLE tariff_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tariff_rates
CREATE POLICY "Anyone can read tariff rates"
  ON tariff_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only service role can insert tariff rates"
  ON tariff_rates FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Only service role can update tariff rates"
  ON tariff_rates FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Only service role can delete tariff rates"
  ON tariff_rates FOR DELETE
  TO service_role
  USING (true);

-- RLS Policies for api_rate_limits
CREATE POLICY "Anyone can read API rate limits"
  ON api_rate_limits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only service role can manage API rate limits"
  ON api_rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_tariff_rates_updated_at ON tariff_rates;
CREATE TRIGGER update_tariff_rates_updated_at
  BEFORE UPDATE ON tariff_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_rate_limits_updated_at ON api_rate_limits;
CREATE TRIGGER update_api_rate_limits_updated_at
  BEFORE UPDATE ON api_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();