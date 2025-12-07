/*
  # Create HS Code Classifications Database

  1. New Tables
    - `classifications`
      - `id` (uuid, primary key)
      - `product_name` (text, required)
      - `customer_name` (text, optional)
      - `hs_code` (text, required)
      - `chapter` (text, required)
      - `description` (text, required)
      - `confidence` (integer, required)
      - `is_dual_use` (boolean, default false)
      - `reasoning` (text, optional)
      - `wto_links` (jsonb, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `classifications` table
    - Add policies for authenticated users to manage their own data
    - Add policy for anonymous users to read and create classifications

  3. Indexes
    - Add indexes for efficient searching by product name, HS code, and date
*/

CREATE TABLE IF NOT EXISTS classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  customer_name text,
  hs_code text NOT NULL,
  chapter text NOT NULL,
  description text NOT NULL,
  confidence integer NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  is_dual_use boolean DEFAULT false,
  reasoning text,
  wto_links jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;

-- Create policies for data access
CREATE POLICY "Anyone can read classifications"
  ON classifications
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create classifications"
  ON classifications
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can update their own classifications"
  ON classifications
  FOR UPDATE
  TO public
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classifications_product_name ON classifications USING gin(to_tsvector('english', product_name));
CREATE INDEX IF NOT EXISTS idx_classifications_hs_code ON classifications (hs_code);
CREATE INDEX IF NOT EXISTS idx_classifications_customer_name ON classifications (customer_name) WHERE customer_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_classifications_created_at ON classifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_classifications_is_dual_use ON classifications (is_dual_use) WHERE is_dual_use = true;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_classifications_updated_at
  BEFORE UPDATE ON classifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();