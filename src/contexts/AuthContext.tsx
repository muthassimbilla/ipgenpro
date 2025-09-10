import React, { createContext, useContext, useState, useEffect } from 'react';
import { verifyApiKey, setCurrentApiKey, initializeDatabase, type ApiKey } from '../lib/supabase';

interface AuthContextType {
  currentUser: ApiKey | null;
  login: (apiKey: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<ApiKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize database first
    initializeDatabase();
    
    // Check for stored API key on mount
    const storedKey = localStorage.getItem('proxy_api_key');
    if (storedKey) {
      verifyStoredKey(storedKey);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Periodic API key verification every 5 minutes
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    // Only set up interval if user is logged in
    if (currentUser) {
      console.log('Setting up periodic API key verification...');
      
      intervalId = setInterval(async () => {
        const storedKey = localStorage.getItem('proxy_api_key');
        
        if (storedKey && currentUser) {
          console.log('Performing periodic API key verification...');
          
          try {
            const user = await verifyApiKey(storedKey);
            
            if (!user) {
              console.log('API key is no longer valid, logging out...');
              // Key is no longer valid, logout the user
              logout();
            } else {
              // Update user data in case any details changed
              if (JSON.stringify(user) !== JSON.stringify(currentUser)) {
                console.log('User data updated during periodic verification');
                setCurrentUser(user);
              }
            }
          } catch (error) {
            console.error('Error during periodic API key verification:', error);
            // On verification error, logout to be safe
            logout();
          }
        }
      }, 5 * 60 * 1000); // Check every 5 minutes
    }

    // Cleanup interval on unmount or when user logs out
    return () => {
      if (intervalId) {
        console.log('Clearing periodic API key verification interval');
        clearInterval(intervalId);
      }
    };
  }, [currentUser]); // Re-run when currentUser changes

  const verifyStoredKey = async (apiKey: string) => {
    try {
      const user = await verifyApiKey(apiKey);
      if (user) {
        await setCurrentApiKey(apiKey);
        setCurrentUser(user);
      } else {
        localStorage.removeItem('proxy_api_key');
      }
    } catch (error) {
      console.error('Error verifying stored key:', error);
      localStorage.removeItem('proxy_api_key');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (apiKey: string): Promise<boolean> => {
    try {
      console.log('Attempting to verify API key:', apiKey);
      
      // Set the API key for subsequent requests
      await setCurrentApiKey(apiKey);
      
      const user = await verifyApiKey(apiKey);
      console.log('API key verification result:', user);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('proxy_api_key', apiKey);
        console.log('Login successful for user:', user.user_name);
        return true;
      }
      console.log('API key verification failed - no user found');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('proxy_api_key');
  };

  const value = {
    currentUser,
    login,
    logout,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}