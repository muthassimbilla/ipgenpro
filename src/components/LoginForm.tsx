import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Key, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginForm() {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please Enter your KEY');
      return;
    }

    setIsLoading(true);
    setError('');
    
    console.log('Login attempt with API key:', apiKey.trim());

    try {
      const success = await login(apiKey.trim());
      if (!success) {
        setError('Wrong key');
        console.log('Login failed - invalid API key');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center px-4 py-6">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 sm:mb-6 mx-auto shadow-lg">
            <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            IP GEN PRO
          </CardTitle>
          <p className="text-slate-600 dark:text-slate-300 mt-2">
            Enter your KEY to access the proxy generator
          </p>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
                <Input
                  type="password"
                  placeholder="Enter your KEY"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pl-8 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                  disabled={isLoading}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs sm:text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-10 sm:h-12 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : (
                <>
                  <Key className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Access System
                </>
              )}
            </Button>
          </form>
          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <div className="space-y-2">
              <p>Need an API key? Contact your administrator</p>
              <p className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded break-all">
                <strong>Unlimited IP Generator</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
