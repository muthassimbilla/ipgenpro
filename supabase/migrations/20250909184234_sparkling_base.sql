/*
  # Fix RLS Policies and Infinite Recursion Issues

  1. Problem Analysis
    - Infinite recursion in api_keys RLS policies
    - API key verification failing due to circular dependencies
    - Admin operations not working properly

  2. Solution
    - Drop all existing problematic policies
    - Create simple, non-recursive policies
    - Use security definer functions for safe operations
    - Separate concerns to avoid circular dependencies

  3. Security
    - Maintain proper access control
    - Allow initial setup without recursion
    - Enable admin operations through proper context
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Allow key verification" ON api_keys;
DROP POLICY IF EXISTS "Allow default admin key creation" ON api_keys;
DROP POLICY IF EXISTS "Allow authenticated admin operations" ON api_keys;
DROP POLICY IF EXISTS "Allow admin operations" ON api_keys;
DROP POLICY IF EXISTS "Admin operations" ON api_keys;
DROP POLICY IF EXISTS "Allow API key verification" ON api_keys;

-- Temporarily disable RLS to clean up
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;

-- Ensure the default admin key exists
INSERT INTO api_keys (key_value, user_name, is_admin, is_active) 
VALUES ('admin123', 'Default Admin', true, true)
ON CONFLICT (key_value) DO NOTHING;

-- Re-enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create a simple policy for reading API keys (for verification)
CREATE POLICY "api_keys_select_policy"
  ON api_keys
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create a policy for admin operations using session variables
CREATE POLICY "api_keys_admin_policy"
  ON api_keys
  FOR ALL
  TO anon, authenticated
  USING (
    -- Allow if user is marked as admin in session
    COALESCE(current_setting('app.is_admin', true)::boolean, false) = true
  )
  WITH CHECK (
    -- Allow creation/update if user is marked as admin in session
    COALESCE(current_setting('app.is_admin', true)::boolean, false) = true
  );

-- Update the verify_api_key function to be more robust
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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ak.id, ak.key_value, ak.user_name, ak.is_active, ak.is_admin, 
         ak.expires_at, ak.created_at, ak.updated_at
  FROM api_keys ak
  WHERE ak.key_value = input_key
    AND ak.is_active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > now());
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION verify_api_key(text) TO anon, authenticated;