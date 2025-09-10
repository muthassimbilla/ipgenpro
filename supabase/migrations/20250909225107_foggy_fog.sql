/*
  # Add Batch System for Generation History

  1. New Tables
    - `generation_batches` - Track each generation batch
      - `id` (uuid, primary key)
      - `api_key_id` (uuid, foreign key to api_keys)
      - `total_generated` (integer) - Number of proxies in this batch
      - `created_at` (timestamptz)

  2. Table Changes
    - Add `batch_id` column to `generated_proxies` table
    - Link each proxy to its generation batch

  3. Functions
    - Update existing functions to work with batch system
    - Add functions to retrieve proxies by batch

  4. Security
    - Maintain existing RLS policies
    - Add policies for new batch table
*/

-- Create generation_batches table
CREATE TABLE IF NOT EXISTS generation_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE CASCADE,
  total_generated integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add batch_id column to generated_proxies
ALTER TABLE generated_proxies 
ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES generation_batches(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_generation_batches_api_key_id ON generation_batches(api_key_id);
CREATE INDEX IF NOT EXISTS idx_generated_proxies_batch_id ON generated_proxies(batch_id);

-- Enable RLS on generation_batches
ALTER TABLE generation_batches ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for generation_batches
CREATE POLICY "batch_access_policy" ON generation_batches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Function to create a new batch and return batch_id
CREATE OR REPLACE FUNCTION create_generation_batch(
  p_api_key_id uuid,
  p_total_generated integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  batch_id uuid;
BEGIN
  INSERT INTO generation_batches (api_key_id, total_generated)
  VALUES (p_api_key_id, p_total_generated)
  RETURNING id INTO batch_id;
  
  RETURN batch_id;
END;
$$;

-- Function to get proxies by batch_id
CREATE OR REPLACE FUNCTION get_proxies_by_batch(
  p_batch_id uuid,
  requesting_api_key_id uuid
)
RETURNS TABLE(
  id uuid,
  proxy_string text,
  host text,
  port text,
  user_id text,
  country text,
  session_id text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify that the requesting user owns this batch
  IF NOT EXISTS (
    SELECT 1 FROM generation_batches gb
    WHERE gb.id = p_batch_id AND gb.api_key_id = requesting_api_key_id
  ) THEN
    RAISE EXCEPTION 'Access denied: You can only access your own batches';
  END IF;
  
  RETURN QUERY
  SELECT gp.id, gp.proxy_string, gp.host, gp.port, gp.user_id, gp.country, gp.session_id, gp.created_at
  FROM generated_proxies gp
  WHERE gp.batch_id = p_batch_id
  ORDER BY gp.created_at ASC;
END;
$$;

-- Function to get generation history with batch info
CREATE OR REPLACE FUNCTION get_user_generation_history(
  p_api_key_id uuid
)
RETURNS TABLE(
  batch_id uuid,
  total_generated integer,
  created_at timestamptz,
  action_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gb.id as batch_id,
    gb.total_generated,
    gb.created_at,
    'generate'::text as action_type
  FROM generation_batches gb
  WHERE gb.api_key_id = p_api_key_id
  
  UNION ALL
  
  SELECT 
    NULL::uuid as batch_id,
    gh.total_generated,
    gh.created_at,
    gh.action_type
  FROM generation_history gh
  WHERE gh.api_key_id = p_api_key_id
  AND gh.action_type IN ('copy', 'download')
  
  ORDER BY created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_generation_batch(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_proxies_by_batch(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_generation_history(uuid) TO anon, authenticated;