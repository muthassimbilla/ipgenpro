/*
  # Fix RLS Policies for API Keys

  1. Policy Changes
    - Drop the existing restrictive admin policy
    - Add policy to allow anonymous users to insert the default admin key
    - Add policy to allow anonymous users to select keys for verification
    - Re-create admin management policy with proper clauses

  2. Security
    - Allow initial admin key creation
    - Allow API key verification for login
    - Maintain admin-only management for authenticated users
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admin can manage all keys" ON api_keys;

-- Allow anonymous users to insert the default admin key only
CREATE POLICY "Allow anon insert default admin key"
  ON api_keys
  FOR INSERT
  TO anon
  WITH CHECK (
    key_value = 'admin123' 
    AND is_admin = true
  );

-- Allow anonymous users to select keys for verification
CREATE POLICY "Allow anon select for key verification"
  ON api_keys
  FOR SELECT
  TO anon
  USING (
    key_value = current_setting('request.headers', true)::json->>'x-api-key'
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Re-create admin management policy with proper clauses
CREATE POLICY "Admin can manage all keys"
  ON api_keys
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM api_keys ak 
      WHERE ak.key_value = current_setting('app.current_api_key', true) 
      AND ak.is_admin = true 
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > now())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM api_keys ak 
      WHERE ak.key_value = current_setting('app.current_api_key', true) 
      AND ak.is_admin = true 
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > now())
    )
  );