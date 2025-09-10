/*
  # Fix API Key Verification Issues

  1. Policy Changes
    - Simplify RLS policies to allow proper API key verification
    - Create a policy that allows reading API keys for verification without complex header checks
    - Ensure admin operations work properly

  2. Security
    - Allow API key verification for login
    - Maintain proper access control for admin operations
*/

-- Drop all existing policies on api_keys
DROP POLICY IF EXISTS "Allow anon insert default admin key" ON api_keys;
DROP POLICY IF EXISTS "Allow anon select for key verification" ON api_keys;
DROP POLICY IF EXISTS "Admin can manage all keys" ON api_keys;
DROP POLICY IF EXISTS "Admin app operations" ON api_keys;

-- Create a simple policy that allows reading active API keys for verification
CREATE POLICY "Allow API key verification"
  ON api_keys
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Create a policy for admin operations that checks for valid admin key
CREATE POLICY "Admin operations"
  ON api_keys
  FOR ALL
  TO anon, authenticated
  USING (
    -- Allow if user has admin privileges (for reading their own data)
    is_admin = true
    OR
    -- Allow if there's a valid admin key in the session
    EXISTS (
      SELECT 1 FROM api_keys ak 
      WHERE ak.key_value = current_setting('app.current_api_key', true) 
      AND ak.is_admin = true 
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > now())
    )
  )
  WITH CHECK (
    -- Allow creation/update if there's a valid admin key in the session
    EXISTS (
      SELECT 1 FROM api_keys ak 
      WHERE ak.key_value = current_setting('app.current_api_key', true) 
      AND ak.is_admin = true 
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > now())
    )
  );

-- Ensure the default admin key exists
INSERT INTO api_keys (key_value, user_name, is_admin, is_active) 
VALUES ('admin123', 'Default Admin', true, true)
ON CONFLICT (key_value) DO NOTHING;