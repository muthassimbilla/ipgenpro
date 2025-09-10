/*
  # Fix Infinite Recursion in API Keys Policies

  1. Problem
    - RLS policies on api_keys table are querying the same table, causing infinite recursion
    - This prevents default admin key creation and admin operations

  2. Solution
    - Create a SECURITY DEFINER function to safely check admin privileges
    - Restructure RLS policies to avoid self-referencing queries
    - Allow anonymous insertion of default admin key only
    - Use the security definer function for admin operations

  3. Security
    - Maintain proper access control without circular dependencies
    - Allow API key verification for authentication
    - Enable admin operations through secure function
*/

-- Drop all existing policies on api_keys to start fresh
DROP POLICY IF EXISTS "Allow API key verification" ON api_keys;
DROP POLICY IF EXISTS "Admin operations" ON api_keys;

-- Create a security definer function to check admin privileges without triggering RLS
CREATE OR REPLACE FUNCTION check_admin_privileges()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key_header text;
  is_admin_key boolean := false;
BEGIN
  -- Get the API key from the request headers
  api_key_header := current_setting('request.headers', true)::json->>'x-api-key';
  
  -- If no API key header, return false
  IF api_key_header IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if the API key exists and is an active admin key
  -- This query bypasses RLS because the function is SECURITY DEFINER
  SELECT EXISTS (
    SELECT 1 FROM api_keys 
    WHERE key_value = api_key_header 
    AND is_admin = true 
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ) INTO is_admin_key;
  
  RETURN is_admin_key;
END;
$$;

-- Create policy for API key verification (read-only for authentication)
CREATE POLICY "Allow API key verification"
  ON api_keys
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Create policy to allow insertion of default admin key only
CREATE POLICY "Allow default admin key creation"
  ON api_keys
  FOR INSERT
  TO anon
  WITH CHECK (
    key_value = 'admin123' 
    AND user_name = 'Default Admin' 
    AND is_admin = true 
    AND is_active = true
  );

-- Create policy for admin operations using the security definer function
CREATE POLICY "Admin can manage all keys"
  ON api_keys
  FOR ALL
  TO authenticated
  USING (check_admin_privileges())
  WITH CHECK (check_admin_privileges());

-- Ensure the default admin key exists
INSERT INTO api_keys (key_value, user_name, is_admin, is_active) 
VALUES ('admin123', 'Default Admin', true, true)
ON CONFLICT (key_value) DO NOTHING;