/*
  # Clean Proxy Generator Database Setup

  1. New Tables
    - `api_keys` - API key management
    - `generated_proxies` - Generated proxy storage
    - `generation_history` - Usage tracking

  2. Security
    - Simple RLS policies without recursion
    - Security definer functions for admin operations
    - Application-level security

  3. Features
    - Default admin key creation
    - Proxy generation and storage
    - Usage statistics
*/

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS generation_history CASCADE;
DROP TABLE IF EXISTS generated_proxies CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;

-- Drop any existing functions
DROP FUNCTION IF EXISTS verify_api_key_final(text) CASCADE;
DROP FUNCTION IF EXISTS get_all_api_keys_final(text) CASCADE;
DROP FUNCTION IF EXISTS create_api_key_final(text, text, text, boolean, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS update_api_key_final(text, uuid, text, boolean, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS delete_api_key_final(text, uuid) CASCADE;

-- Create api_keys table
CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_value text UNIQUE NOT NULL,
  user_name text NOT NULL,
  is_active boolean DEFAULT true,
  is_admin boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create generated_proxies table
CREATE TABLE generated_proxies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
  proxy_string text NOT NULL,
  host text NOT NULL,
  port text NOT NULL,
  user_id text NOT NULL,
  country text NOT NULL,
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create generation_history table
CREATE TABLE generation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
  total_generated integer NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('generate', 'copy', 'download')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_api_keys_key_value ON api_keys(key_value);
CREATE INDEX idx_generated_proxies_proxy_string ON generated_proxies(proxy_string);
CREATE INDEX idx_generated_proxies_api_key_id ON generated_proxies(api_key_id);
CREATE INDEX idx_generation_history_api_key_id ON generation_history(api_key_id);

-- Insert default admin key
INSERT INTO api_keys (key_value, user_name, is_admin, is_active) 
VALUES ('admin123', 'Default Admin', true, true);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_proxies ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_history ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies (no recursion)
CREATE POLICY "api_keys_policy" ON api_keys FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "generated_proxies_policy" ON generated_proxies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "generation_history_policy" ON generation_history FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Security definer functions for safe operations
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

CREATE OR REPLACE FUNCTION get_all_api_keys(admin_key text)
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
  SELECT ak.id, ak.key_value, ak.user_name, ak.is_active, ak.is_admin,
         ak.expires_at, ak.created_at, ak.updated_at
  FROM api_keys ak
  ORDER BY ak.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION create_api_key(
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
  INSERT INTO api_keys (key_value, user_name, is_admin, expires_at)
  VALUES (new_key_value, new_user_name, new_is_admin, new_expires_at)
  RETURNING api_keys.id, api_keys.key_value, api_keys.user_name, 
            api_keys.is_active, api_keys.is_admin, api_keys.expires_at,
            api_keys.created_at, api_keys.updated_at;
END;
$$;

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

CREATE OR REPLACE FUNCTION delete_api_key(
  admin_key text,
  key_id uuid
)
RETURNS boolean
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
  
  -- Don't allow deleting admin keys
  IF EXISTS (SELECT 1 FROM api_keys WHERE id = key_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Cannot delete admin keys';
  END IF;
  
  DELETE FROM api_keys WHERE id = key_id;
  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_api_key(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_all_api_keys(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_api_key(text, text, text, boolean, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_api_key(text, uuid, text, boolean, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_api_key(text, uuid) TO anon, authenticated;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for api_keys updated_at
CREATE TRIGGER update_api_keys_updated_at 
  BEFORE UPDATE ON api_keys 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();