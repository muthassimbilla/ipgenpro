import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  User, 
  History, 
  BarChart3, 
  Hash,
  Calendar,
  Activity,
  ArrowLeft,
  Copy,
  Download,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getUserProxyHistory, 
  getUserStats, 
  getProxiesByBatch,
  logGenerationHistory,
  type GeneratedProxy,
  type GenerationHistory 
} from '../lib/supabase';

interface UserProfileProps {
  onBack: () => void;
}

export default function UserProfile({ onBack }: UserProfileProps) {
  const { currentUser } = useAuth();
  const [proxyHistory, setProxyHistory] = useState<GenerationHistory[]>([]);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalGenerated: 0,
    totalSessions: 0,
    totalCopied: 0,
    totalDownloaded: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  const loadUserData = async () => {
    if (!currentUser) return;

    try {
      const [historyData, statsData] = await Promise.all([
        getUserProxyHistory(currentUser.id),
        getUserStats(currentUser.id)
      ]);

      // Filter to only show 'generate' type entries (from generation_batches)
      // Hide 'copy' and 'download' entries from generation_history
      const filteredHistory = historyData.filter(entry => entry.action_type === 'generate');
      setProxyHistory(filteredHistory);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyBatchProxies = async (batchId: string, totalGenerated: number) => {
    if (!currentUser) return;
    console.log('Copying proxies for batch ID:', batchId);
    try {
      const proxies = await getProxiesByBatch(batchId, currentUser.id);
      console.log('Found proxies for batch:', proxies.length);
      
      if (proxies.length === 0) {
        alert('No proxies found for this batch. The batch may be empty.');
        return;
      }
      
      const proxyStrings = proxies.map(p => p.proxy_string).join('\n');
      console.log('Proxy strings to copy:', proxyStrings.substring(0, 100) + '...');
      
      await navigator.clipboard.writeText(proxyStrings);
      setCopySuccess(batchId);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy proxies:', err);
      alert('Failed to copy proxies. Please try again.');
    }
  };

  const downloadBatchProxies = async (batchId: string, totalGenerated: number) => {
    if (!currentUser) return;
    console.log('Downloading proxies for batch ID:', batchId);
    try {
      const proxies = await getProxiesByBatch(batchId, currentUser.id);
      console.log('Found proxies for batch:', proxies.length);
      
      if (proxies.length === 0) {
        alert('No proxies found for this batch. The batch may be empty.');
        return;
      }
      
      const proxyStrings = proxies.map(p => p.proxy_string).join('\n');
      console.log('Proxy strings to download:', proxyStrings.substring(0, 100) + '...');
      
      const blob = new Blob([proxyStrings], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proxies_batch_${batchId.substring(0, 8)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccess(batchId);
      setTimeout(() => setDownloadSuccess(null), 2000);
    } catch (err) {
      console.error('Failed to download proxies:', err);
      alert('Failed to download proxies. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={onBack}
          variant="outline"
          size="lg"
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Generator
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            User Profile
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Welcome back, {currentUser?.user_name}
          </p>
        </div>
      </div>

      {/* User Info Card */}
      <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <User className="h-6 w-6" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Username</label>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {currentUser?.user_name}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Account Type</label>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {currentUser?.is_admin ? 'Administrator' : 'User'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Member Since</label>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {formatDate(currentUser?.created_at || '')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Status</label>
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                Active
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Generated</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.totalGenerated.toLocaleString()}
                </p>
              </div>
              <Hash className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Sessions</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.totalSessions}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Actions</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.totalCopied + stats.totalDownloaded}
                </p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Downloads</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.totalDownloaded}
                </p>
              </div>
              <Download className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Proxy History */}
      <Card className="shadow-xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <History className="h-6 w-6" />
            Generation History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {proxyHistory.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">No generation history found</p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Generate some proxies to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {proxyHistory.map((history) => (
                <div
                  key={history.id}
                  className="bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            history.action_type === 'generate' 
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                              : history.action_type === 'copy'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          }`}>
                            {history.action_type === 'generate' ? 'Generated' : 
                             history.action_type === 'copy' ? 'Copied' : 'Downloaded'}
                          </div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {history.total_generated} proxies
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(history.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      {history.action_type === 'generate' && history.batch_id && (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => copyBatchProxies(history.batch_id!, history.total_generated)}
                            variant="outline"
                            size="sm"
                            className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            <Copy className="h-4 w-4" />
                            {copySuccess === history.batch_id && <CheckCircle className="h-4 w-4 ml-1 text-emerald-500" />}
                          </Button>
                          <Button
                            onClick={() => downloadBatchProxies(history.batch_id!, history.total_generated)}
                            variant="outline"
                            size="sm"
                            className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            <Download className="h-4 w-4" />
                            {downloadSuccess === history.batch_id && <CheckCircle className="h-4 w-4 ml-1 text-emerald-500" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}