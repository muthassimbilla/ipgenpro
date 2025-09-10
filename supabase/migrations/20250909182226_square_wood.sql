/*
  # Add Configuration Functions for Session Variables

  1. Functions
    - set_config: Set session configuration variables
    - These functions help manage RLS policies by setting session variables

  2. Security
    - SECURITY DEFINER functions to allow setting session variables
    - Used for managing RLS policy conditions
*/

-- Function to set configuration variables
CREATE OR REPLACE FUNCTION set_config(
  setting_name text,
  setting_value text,
  is_local boolean DEFAULT true
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, is_local);
  RETURN setting_value;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION set_config(text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_api_key(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_admin_key(text) TO anon, authenticated;