/*
  # Fix Admin Key Creation Policy

  1. Policy Changes
    - Update the admin management policy to properly handle key creation
    - Allow authenticated users with valid admin API keys to create new keys
    - Fix the WITH CHECK clause to use the same logic as USING clause

  2. Security
    - Maintain admin-only access for key management
    - Ensure proper authentication through API key verification
*/

-- Drop the existing admin management policy
DROP POLICY IF EXISTS "Admin can manage all keys" ON api_keys;

-- Create a more permissive admin management policy that works for all operations
CREATE POLICY "Admin can manage all keys"
  ON api_keys
  FOR ALL
  TO authenticated
  USING (
    -- Allow access if user has valid admin API key
    EXISTS (
      SELECT 1 FROM api_keys ak 
      WHERE ak.key_value = current_setting('app.current_api_key', true) 
      AND ak.is_admin = true 
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > now())
    )
  )
  WITH CHECK (
    -- Allow creation/update if user has valid admin API key
    EXISTS (
      SELECT 1 FROM api_keys ak 
      WHERE ak.key_value = current_setting('app.current_api_key', true) 
      AND ak.is_admin = true 
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > now())
    )
  );

-- Also create a policy specifically for admin operations through the application
CREATE POLICY "Admin app operations"
  ON api_keys
  FOR ALL
  TO anon
  USING (
    -- Allow if the request has a valid admin API key in headers
    EXISTS (
      SELECT 1 FROM api_keys ak 
      WHERE ak.key_value = current_setting('request.headers', true)::json->>'x-api-key'
      AND ak.is_admin = true 
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > now())
    )
  )
  WITH CHECK (
    -- Allow creation if the request has a valid admin API key in headers
    EXISTS (
      SELECT 1 FROM api_keys ak 
      WHERE ak.key_value = current_setting('request.headers', true)::json->>'x-api-key'
      AND ak.is_admin = true 
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > now())
    )
  );