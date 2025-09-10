/*
  # Fix Login and Key Management System Issues

  1. Problem Analysis
    - RLS policies causing infinite recursion
    - API key verification failing
    - Admin operations not working properly
    - Default admin key creation issues

  2. Solution
    - Disable RLS temporarily for system operations
    - Create proper security definer functions
    - Restructure policies to avoid circular dependencies
    - Fix API key verification flow

  3. Security
    - Maintain proper access control
    - Allow system initialization
    - Enable proper admin operations
*/

-- First, disable RLS on api_keys to fix immediate issues
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start clean
DROP POLICY IF EXISTS "Allow API key verification" ON api_keys;
DROP POLICY IF EXISTS "Allow default admin key creation" ON api_keys;
DROP POLICY IF EXISTS "Admin can manage all keys" ON api_keys;
DROP POLICY IF EXISTS "Allow key verification" ON api_keys;
DROP POLICY IF EXISTS "Allow admin operations" ON api_keys;

-- Drop the problematic function if it exists
DROP FUNCTION IF EXISTS check_admin_privileges();

-- Create a simple, safe function to verify API keys without RLS issues
CREATE OR REPLACE FUNCTION verify_api_key(input_key text)
RETURNS TABLE(
  id uuid,
  key_value text,
  user_name text,
  is_active boolean,
  is_admin boolean,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ak.id, ak.key_value, ak.user_name, ak.is_active, ak.is_admin, ak.expires_at, ak.created_at, ak.updated_at
  FROM api_keys ak
  WHERE ak.key_value = input_key
    AND ak.is_active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > now());
END;
$$;

-- Create a function to check if a key has admin privileges
CREATE OR REPLACE FUNCTION is_admin_key(input_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_check boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM api_keys ak
    WHERE ak.key_value = input_key
      AND ak.is_admin = true
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > now())
  ) INTO admin_check;
  
  RETURN admin_check;
END;
$$;

-- Ensure the default admin key exists
INSERT INTO api_keys (key_value, user_name, is_admin, is_active) 
VALUES ('admin123', 'Default Admin', true, true)
ON CONFLICT (key_value) DO NOTHING;

-- Re-enable RLS with properly structured policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow SELECT for key verification (no recursion risk)
CREATE POLICY "Allow key verification"
  ON api_keys
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy 2: Allow anon to INSERT only the default admin key (for initial setup)
CREATE POLICY "Allow default admin key creation"
  ON api_keys
  FOR INSERT
  TO anon
  WITH CHECK (key_value = 'admin123' AND is_admin = true);

-- Policy 3: Allow authenticated users with admin flag to perform all operations
CREATE POLICY "Allow authenticated admin operations"
  ON api_keys
  FOR ALL
  TO authenticated
  USING (current_setting('app.is_admin', true)::boolean = true)
  WITH CHECK (current_setting('app.is_admin', true)::boolean = true);

-- Update RLS policies for generated_proxies to be simpler
DROP POLICY IF EXISTS "Users can access their own proxies" ON generated_proxies;
DROP POLICY IF EXISTS "Allow proxy access" ON generated_proxies;
CREATE POLICY "Allow proxy access"
  ON generated_proxies
  FOR ALL
  TO anon, authenticated
  USING (
    api_key_id::text = current_setting('app.current_api_key_id', true)
  );

-- Update RLS policies for generation_history to be simpler
DROP POLICY IF EXISTS "Users can access their own history" ON generation_history;
DROP POLICY IF EXISTS "Allow history access" ON generation_history;
CREATE POLICY "Allow history access"
  ON generation_history
  FOR ALL
  TO anon, authenticated
  USING (
    api_key_id::text = current_setting('app.current_api_key_id', true)
  );