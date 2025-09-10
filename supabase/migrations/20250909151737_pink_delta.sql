/*
  # Proxy Generator System Database Schema

  1. New Tables
    - `api_keys`
      - `id` (uuid, primary key)
      - `key_value` (text, unique) - The actual API key
      - `user_name` (text) - Name/identifier for the key holder
      - `is_active` (boolean) - Whether the key is active
      - `is_admin` (boolean) - Whether this key has admin privileges
      - `expires_at` (timestamptz) - Expiration date (nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `generated_proxies`
      - `id` (uuid, primary key)
      - `api_key_id` (uuid, foreign key to api_keys)
      - `proxy_string` (text) - The generated proxy string
      - `host` (text)
      - `port` (text)
      - `user_id` (text)
      - `country` (text)
      - `session_id` (text)
      - `created_at` (timestamptz)
    
    - `generation_history`
      - `id` (uuid, primary key)
      - `api_key_id` (uuid, foreign key to api_keys)
      - `total_generated` (integer) - Number of proxies generated in this batch
      - `action_type` (text) - 'generate', 'copy', 'download'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access based on API keys
    - Admin-only policies for key management

  3. Indexes
    - Index on api_keys.key_value for fast lookups
    - Index on generated_proxies.proxy_string for duplicate checking
    - Index on api_key_id for history queries
*/

-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
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
CREATE TABLE IF NOT EXISTS generated_proxies (
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
CREATE TABLE IF NOT EXISTS generation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
  total_generated integer NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('generate', 'copy', 'download')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_proxies ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_history ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_key_value ON api_keys(key_value);
CREATE INDEX IF NOT EXISTS idx_generated_proxies_proxy_string ON generated_proxies(proxy_string);
CREATE INDEX IF NOT EXISTS idx_generated_proxies_api_key_id ON generated_proxies(api_key_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_api_key_id ON generation_history(api_key_id);

-- RLS Policies for api_keys (admin only for management)
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
  );

-- RLS Policies for generated_proxies
CREATE POLICY "Users can access their own proxies"
  ON generated_proxies
  FOR ALL
  TO authenticated
  USING (
    api_key_id IN (
      SELECT id FROM api_keys 
      WHERE key_value = current_setting('app.current_api_key', true)
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- RLS Policies for generation_history
CREATE POLICY "Users can access their own history"
  ON generation_history
  FOR ALL
  TO authenticated
  USING (
    api_key_id IN (
      SELECT id FROM api_keys 
      WHERE key_value = current_setting('app.current_api_key', true)
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- Insert default admin key (change this in production!)
INSERT INTO api_keys (key_value, user_name, is_admin, is_active) 
VALUES ('admin123', 'Default Admin', true, true)
ON CONFLICT (key_value) DO NOTHING;

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