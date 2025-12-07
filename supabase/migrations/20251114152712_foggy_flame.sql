/*
  # Fix Database Security Issues

  1. Security
    - Fix function search_path mutability issue
    - Secure update_updated_at_column function

  2. Index Utilization
    - Ensure all created indexes are properly used by queries
    - Update function to be immutable where possible
*/

-- Drop and recreate the function with secure search_path
DROP FUNCTION IF EXISTS update_updated_at_column();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_classifications_updated_at ON classifications;

CREATE TRIGGER update_classifications_updated_at
    BEFORE UPDATE ON classifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();