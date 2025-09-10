import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize database
export const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');
    
    // Check if default admin key exists
    const { data, error } = await supabase.rpc('verify_api_key', {
      input_key: 'admin123'
    });

    if (error) {
      console.error('Error checking admin key:', error);
    } else if (data && data.length > 0) {
      console.log('Database initialized successfully');
    } else {
      console.log('Default admin key not found');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

export interface ApiKey {
  id: string;
  key_value: string;
  user_name: string;
  is_active: boolean;
  is_admin: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedProxy {
  id: string;
  api_key_id: string;
  proxy_string: string;
  host: string;
  port: string;
  user_id: string;
  country: string;
  session_id: string;
  created_at: string;
  batch_id?: string;
}

export interface GenerationHistory {
  id: string;
  api_key_id: string;
  total_generated: number;
  action_type: 'generate' | 'copy' | 'download';
  created_at: string;
  batch_id?: string;
}

// Store current API key for admin operations
let currentApiKey: string | null = null;

// Set the current API key
export const setCurrentApiKey = async (apiKey: string) => {
  currentApiKey = apiKey;
};

// Verify API key
export const verifyApiKey = async (apiKey: string): Promise<ApiKey | null> => {
  try {
    console.log('Verifying API key:', apiKey);
    
    const { data, error } = await supabase.rpc('verify_api_key', {
      input_key: apiKey
    });

    if (error) {
      console.error('API key verification error:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log('No API key found for:', apiKey);
      return null;
    }
    
    const apiKeyData = data[0];
    currentApiKey = apiKey;

    console.log('API key verified successfully:', apiKeyData.user_name);
    return apiKeyData;
  } catch (err) {
    console.error('Error verifying API key:', err);
    return null;
  }
};

// Check for duplicate proxies
export const checkDuplicateProxies = async (proxyStrings: string[]): Promise<string[]> => {
  const { data, error } = await supabase
    .from('generated_proxies')
    .select('proxy_string')
    .in('proxy_string', proxyStrings);

  if (error) {
    console.error('Error checking duplicates:', error);
    return [];
  }

  return data.map(item => item.proxy_string);
};

// Save generated proxies
export const saveGeneratedProxies = async (
  apiKeyId: string,
  proxies: Array<{
    proxy_string: string;
    host: string;
    port: string;
    user_id: string;
    country: string;
    session_id: string;
  }>
) => {
  // First, create a generation batch
  const { data: batchData, error: batchError } = await supabase.rpc('create_generation_batch', {
    p_api_key_id: apiKeyId,
    p_total_generated: proxies.length
  });

  if (batchError) {
    throw new Error(`Failed to create generation batch: ${batchError?.message || 'Unknown error'}`);
  }

  if (!batchData) {
    throw new Error('No batch ID returned from create_generation_batch');
  }

  const batchId = batchData; // RPC functions return the result directly
  console.log('Created batch with ID:', batchId);

  const proxiesWithApiKey = proxies.map(proxy => ({
    ...proxy,
    api_key_id: apiKeyId
  }));

  const { data: insertedProxies, error: insertError } = await supabase
    .from('generated_proxies')
    .insert(proxiesWithApiKey.map(proxy => ({ ...proxy, batch_id: batchId })))
    .select();


  if (insertError) {
    throw new Error(`Failed to save proxies: ${insertError.message}`);
  }

  // Check if proxies were actually inserted
  if (!insertedProxies || insertedProxies.length === 0) {
    throw new Error('No proxies were actually inserted into the database.');
  }

  console.log(`Successfully saved ${insertedProxies.length} proxies to database with batch ID: ${batchId}`);
  return batchId;
};

// Log generation history
export const logGenerationHistory = async (
  apiKeyId: string,
  totalGenerated: number,
  actionType: 'generate' | 'copy' | 'download'
) => {
  const { error } = await supabase
    .from('generation_history')
    .insert({
      api_key_id: apiKeyId,
      total_generated: totalGenerated,
      action_type: actionType
    });

  if (error) {
    console.error('Error logging history:', error);
  }
};

// Get user's proxy history
// Get user's proxy history using the new RPC function
export const getUserProxyHistory = async (apiKeyId: string): Promise<GenerationHistory[]> => {
  const { data, error } = await supabase.rpc('get_user_generation_history', {
    p_api_key_id: apiKeyId
  });

  if (error) {
    throw new Error(`Failed to fetch history: ${error.message}`);
  }

  // Map the RPC result to the GenerationHistory interface
  return data.map((item: any) => ({
    id: item.batch_id || `${item.created_at}-${item.action_type}-${item.total_generated}`, // Unique ID for UI
    api_key_id: apiKeyId, // Passed from current user
    total_generated: item.total_generated,
    action_type: item.action_type,
    created_at: item.created_at,
    batch_id: item.batch_id // Actual batch_id from RPC, will be null for copy/download
  }));
};

// Get proxies for a specific batch using the new RPC function
export const getProxiesByBatch = async (batchId: string, apiKeyId: string): Promise<GeneratedProxy[]> => {
  const { data, error } = await supabase.rpc('get_proxies_by_batch', {
    p_batch_id: batchId,
    requesting_api_key_id: apiKeyId
  });

  if (error) {
    throw new Error(`Failed to fetch batch proxies: ${error.message}`);
  }

  return data;
};

// Get user's generation statistics
export const getUserStats = async (apiKeyId: string) => {
  const { data: historyData, error: historyError } = await supabase
    .from('generation_history')
    .select('*')
    .eq('api_key_id', apiKeyId);

  const { data: proxyData, error: proxyError } = await supabase
    .from('generated_proxies')
    .select('id')
    .eq('api_key_id', apiKeyId);

  if (historyError || proxyError) {
    throw new Error('Failed to fetch statistics');
  }

  const totalGenerated = proxyData?.length || 0;
  const totalSessions = historyData?.length || 0;
  const totalCopied = historyData?.filter(h => h.action_type === 'copy').length || 0;
  const totalDownloaded = historyData?.filter(h => h.action_type === 'download').length || 0;

  return {
    totalGenerated,
    totalSessions,
    totalCopied,
    totalDownloaded
  };
};

// Admin functions
export const getAllApiKeys = async () => {
  if (!currentApiKey) {
    throw new Error('No API key available for admin operations');
  }

  const { data, error } = await supabase.rpc('get_all_api_keys', {
    admin_key: currentApiKey
  });

  if (error) {
    throw new Error(`Failed to fetch API keys: ${error.message}`);
  }

  return data;
};

export const createApiKey = async (keyData: {
  key_value: string;
  user_name: string;
  is_admin?: boolean;
  expires_at?: string;
}) => {
  if (!currentApiKey) {
    throw new Error('No API key available for admin operations');
  }

  const { data, error } = await supabase.rpc('create_api_key', {
    admin_key: currentApiKey,
    new_key_value: keyData.key_value,
    new_user_name: keyData.user_name,
    new_is_admin: keyData.is_admin || false,
    new_expires_at: keyData.expires_at || null
  });

  if (error || !data || data.length === 0) {
    throw new Error(`Failed to create API key: ${error?.message || 'Unknown error'}`);
  }

  return data[0];
};

export const updateApiKey = async (id: string, updates: Partial<ApiKey>) => {
  if (!currentApiKey) {
    throw new Error('No API key available for admin operations');
  }

  const { data, error } = await supabase.rpc('update_api_key', {
    admin_key: currentApiKey,
    key_id: id,
    new_user_name: updates.user_name || null,
    new_is_active: updates.is_active !== undefined ? updates.is_active : null,
    new_expires_at: updates.expires_at || null
  });

  if (error || !data || data.length === 0) {
    throw new Error(`Failed to update API key: ${error?.message || 'Unknown error'}`);
  }

  return data[0];
};

export const deleteApiKey = async (id: string) => {
  if (!currentApiKey) {
    throw new Error('No API key available for admin operations');
  }

  const { data, error } = await supabase.rpc('delete_api_key', {
    admin_key: currentApiKey,
    key_id: id
  });

  if (error) {
    throw new Error(`Failed to delete API key: ${error.message}`);
  }
};

export const getAdminStats = async () => {
  if (!currentApiKey) {
    throw new Error('No API key available for admin operations');
  }

  const { data: keysData, error: keysError } = await supabase.rpc('get_all_api_keys', {
    admin_key: currentApiKey
  });

  if (keysError) {
    throw new Error(`Failed to fetch admin stats: ${keysError.message}`);
  }

  return keysData;
};