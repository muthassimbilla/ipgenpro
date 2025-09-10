/*
  # Fix SQL Ambiguity in update_api_key Function

  1. Problem
    - Column reference "user_name" is ambiguous in update_api_key function
    - PostgreSQL cannot determine if "user_name" refers to the column or parameter

  2. Solution
    - Replace the existing update_api_key function with qualified column references
    - Use table alias to avoid ambiguity
    - Ensure all column references are fully qualified

  3. Security
    - Maintain the same SECURITY DEFINER functionality
    - Keep the same admin privilege checking logic
*/

-- Drop the existing function that has the ambiguity issue
DROP FUNCTION IF EXISTS update_api_key(text, uuid, text, boolean, timestamptz);

-- Create the corrected function with qualified column references
CREATE OR REPLACE FUNCTION update_api_key(
  admin_key text,
  key_id uuid,
  new_user_name text DEFAULT NULL,
  new_is_active boolean DEFAULT NULL,
  new_expires_at timestamptz DEFAULT NULL
)
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
  -- Check admin privileges
  IF NOT EXISTS (
    SELECT 1 FROM api_keys ak
    WHERE ak.key_value = admin_key
      AND ak.is_admin = true
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN QUERY
  UPDATE api_keys 
  SET 
    user_name = COALESCE(new_user_name, api_keys.user_name),
    is_active = COALESCE(new_is_active, api_keys.is_active),
    expires_at = COALESCE(new_expires_at, api_keys.expires_at),
    updated_at = now()
  WHERE api_keys.id = key_id
  RETURNING api_keys.id, api_keys.key_value, api_keys.user_name,
            api_keys.is_active, api_keys.is_admin, api_keys.expires_at,
            api_keys.created_at, api_keys.updated_at;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_api_key(text, uuid, text, boolean, timestamptz) TO anon, authenticated;