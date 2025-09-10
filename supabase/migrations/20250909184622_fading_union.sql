/*
  # Remove set_config Function Dependency

  1. Problem
    - set_config function ownership error
    - PostgreSQL built-in function conflict
    - Permission issues with custom set_config function

  2. Solution
    - Drop the custom set_config function
    - Remove all references to custom set_config
    - Use PostgreSQL's built-in set_config directly where needed
    - Simplify the security model

  3. Security
    - Maintain security through security definer functions
    - Remove complex session variable management
    - Use direct function calls for admin operations
*/

-- Drop the problematic custom set_config function
DROP FUNCTION IF EXISTS set_config(text, text, boolean);

-- Also drop any other functions that might reference it
DROP FUNCTION IF EXISTS public.set_config(text, text, boolean);

-- Ensure all our security definer functions exist and work properly
-- These functions don't rely on custom set_config

-- Verify that our main functions exist
DO $$
BEGIN
  -- Check if verify_api_key_safe exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'verify_api_key_safe') THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION public.verify_api_key_safe(input_key text)
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
    AS $func$
    BEGIN
      RETURN QUERY
      SELECT ak.id, ak.key_value, ak.user_name, ak.is_active, ak.is_admin, 
             ak.expires_at, ak.created_at, ak.updated_at
      FROM public.api_keys ak
      WHERE ak.key_value = input_key
        AND ak.is_active = true
        AND (ak.expires_at IS NULL OR ak.expires_at > now());
    END;
    $func$;
    ';
  END IF;

  -- Check if create_api_key_admin exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_api_key_admin') THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION public.create_api_key_admin(
      admin_key text,
      new_key_value text,
      new_user_name text,
      new_is_admin boolean DEFAULT false,
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
    AS $func$
    BEGIN
      -- Check if the provided key is an admin key
      IF NOT EXISTS (
        SELECT 1 FROM public.api_keys ak
        WHERE ak.key_value = admin_key
          AND ak.is_admin = true
          AND ak.is_active = true
          AND (ak.expires_at IS NULL OR ak.expires_at > now())
      ) THEN
        RAISE EXCEPTION ''Access denied: Admin privileges required'';
      END IF;
      
      RETURN QUERY
      INSERT INTO public.api_keys (key_value, user_name, is_admin, expires_at)
      VALUES (new_key_value, new_user_name, new_is_admin, new_expires_at)
      RETURNING api_keys.id, api_keys.key_value, api_keys.user_name, 
                api_keys.is_active, api_keys.is_admin, api_keys.expires_at,
                api_keys.created_at, api_keys.updated_at;
    END;
    $func$;
    ';
  END IF;
END $$;

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION public.verify_api_key_safe(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_key_safe(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_api_keys_admin(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_api_key_admin(text, text, text, boolean, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_api_key_admin(text, uuid, text, boolean, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_api_key_admin(text, uuid) TO anon, authenticated;

-- Ensure the default admin key exists
INSERT INTO public.api_keys (key_value, user_name, is_admin, is_active) 
VALUES ('admin123', 'Default Admin', true, true)
ON CONFLICT (key_value) DO NOTHING;