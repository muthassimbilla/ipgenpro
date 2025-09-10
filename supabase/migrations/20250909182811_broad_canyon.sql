/*
  # Fix Parameter Name Conflict in verify_api_key Function

  1. Problem
    - Parameter name "key_value" conflicts with column name "key_value"
    - This causes PostgreSQL compilation error

  2. Solution
    - Rename function parameter to avoid conflict
    - Use different parameter name "input_key"
    - Update function logic accordingly

  3. Security
    - Maintain same security definer functionality
    - Keep proper API key verification logic
*/

-- Drop the existing function with conflicting parameter name
DROP FUNCTION IF EXISTS verify_api_key(text);

-- Create the function with a different parameter name to avoid conflict
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

-- Also fix the is_admin_key function parameter name
DROP FUNCTION IF EXISTS is_admin_key(text);

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_api_key(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_admin_key(text) TO anon, authenticated;