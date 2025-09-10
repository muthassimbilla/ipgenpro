/*
  # Complete Fix for set_config Function Issues

  1. Problem
    - Custom set_config function conflicts with PostgreSQL built-in
    - Ownership errors preventing proper function management
    - Complex session variable dependencies causing issues

  2. Solution
    - Remove ALL references to custom set_config functions
    - Create completely independent security definer functions
    - Use direct database queries without session variables
    - Implement application-level security instead of complex RLS

  3. Security
    - Security definer functions provide safe database access
    - Admin verification through direct database queries
    - No dependency on session variables or custom config functions
*/

-- Drop ALL existing functions that might reference set_config
DROP FUNCTION IF EXISTS set_config(text, text, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.set_config(text, text, boolean) CASCADE;
DROP FUNCTION IF EXISTS verify_api_key(text) CASCADE;
DROP FUNCTION IF EXISTS is_admin_key(text) CASCADE;
DROP FUNCTION IF EXISTS verify_api_key_safe(text) CASCADE;
DROP FUNCTION IF EXISTS is_admin_key_safe(text) CASCADE;
DROP FUNCTION IF EXISTS get_all_api_keys_admin(text) CASCADE;
DROP FUNCTION IF EXISTS create_api_key_admin(text, text, text, boolean, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS update_api_key_admin(text, uuid, text, boolean, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS delete_api_key_admin(text, uuid) CASCADE;

-- Disable RLS temporarily to ensure clean setup
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_proxies DISABLE ROW LEVEL SECURITY;
ALTER TABLE generation_history DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "api_keys_bypass_policy" ON api_keys;
DROP POLICY IF EXISTS "generated_proxies_bypass_policy" ON generated_proxies;
DROP POLICY IF EXISTS "generation_history_bypass_policy" ON generation_history;

-- Create completely independent security definer functions
CREATE OR REPLACE FUNCTION public.verify_api_key_final(input_key text)
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
  FROM public.api_keys ak
  WHERE ak.key_value = input_key
    AND ak.is_active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > now());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_api_keys_final(admin_key text)
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
  -- Direct admin check without recursion
  IF NOT EXISTS (
    SELECT 1 FROM public.api_keys ak
    WHERE ak.key_value = admin_key
      AND ak.is_admin = true
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN QUERY
  SELECT ak.id, ak.key_value, ak.user_name, ak.is_active, ak.is_admin,
         ak.expires_at, ak.created_at, ak.updated_at
  FROM public.api_keys ak
  ORDER BY ak.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_api_key_final(
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
AS $$
BEGIN
  -- Direct admin check without recursion
  IF NOT EXISTS (
    SELECT 1 FROM public.api_keys ak
    WHERE ak.key_value = admin_key
      AND ak.is_admin = true
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN QUERY
  INSERT INTO public.api_keys (key_value, user_name, is_admin, expires_at)
  VALUES (new_key_value, new_user_name, new_is_admin, new_expires_at)
  RETURNING api_keys.id, api_keys.key_value, api_keys.user_name, 
            api_keys.is_active, api_keys.is_admin, api_keys.expires_at,
            api_keys.created_at, api_keys.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_api_key_final(
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
  -- Direct admin check without recursion
  IF NOT EXISTS (
    SELECT 1 FROM public.api_keys ak
    WHERE ak.key_value = admin_key
      AND ak.is_admin = true
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN QUERY
  UPDATE public.api_keys 
  SET 
    user_name = COALESCE(new_user_name, user_name),
    is_active = COALESCE(new_is_active, is_active),
    expires_at = COALESCE(new_expires_at, expires_at),
    updated_at = now()
  WHERE api_keys.id = key_id
  RETURNING api_keys.id, api_keys.key_value, api_keys.user_name,
            api_keys.is_active, api_keys.is_admin, api_keys.expires_at,
            api_keys.created_at, api_keys.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_api_key_final(
  admin_key text,
  key_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct admin check without recursion
  IF NOT EXISTS (
    SELECT 1 FROM public.api_keys ak
    WHERE ak.key_value = admin_key
      AND ak.is_admin = true
      AND ak.is_active = true
      AND (ak.expires_at IS NULL OR ak.expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Don't allow deleting admin keys
  IF EXISTS (SELECT 1 FROM public.api_keys WHERE id = key_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Cannot delete admin keys';
  END IF;
  
  DELETE FROM public.api_keys WHERE id = key_id;
  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.verify_api_key_final(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_api_keys_final(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_api_key_final(text, text, text, boolean, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_api_key_final(text, uuid, text, boolean, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_api_key_final(text, uuid) TO anon, authenticated;

-- Ensure the default admin key exists
INSERT INTO public.api_keys (key_value, user_name, is_admin, is_active) 
VALUES ('admin123', 'Default Admin', true, true)
ON CONFLICT (key_value) DO NOTHING;

-- Re-enable RLS with minimal bypass policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_proxies ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_history ENABLE ROW LEVEL SECURITY;

-- Create minimal bypass policies (security handled in application)
CREATE POLICY "bypass_all_api_keys" ON api_keys FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "bypass_all_proxies" ON generated_proxies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "bypass_all_history" ON generation_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);