import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Shield, 
  Users, 
  Key, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Calendar,
  Activity,
  BarChart3,
  AlertCircle,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getAllApiKeys, 
  createApiKey, 
  updateApiKey, 
  deleteApiKey,
  getAdminStats,
  type ApiKey 
} from '../lib/supabase';

interface AdminPanelProps {
  onBack: () => void;
}

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const { currentUser } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [adminStats, setAdminStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Form states
  const [formData, setFormData] = useState({
    key_value: '',
    user_name: '',
    is_admin: false,
    expires_at: ''
  });

  useEffect(() => {
    if (currentUser?.is_admin) {
      loadAdminData();
    }
  }, [currentUser]);

  const loadAdminData = async () => {
    try {
      const [keysData, statsData] = await Promise.all([
        getAllApiKeys(),
        getAdminStats()
      ]);

      setApiKeys(keysData);
      setAdminStats(statsData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, key_value: result }));
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.key_value || !formData.user_name) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const keyData = {
        ...formData,
        expires_at: formData.expires_at || undefined
      };
      
      await createApiKey(keyData);
      await loadAdminData();
      setShowCreateForm(false);
      setFormData({ key_value: '', user_name: '', is_admin: false, expires_at: '' });
    } catch (error: any) {
      alert(`Error creating key: ${error.message}`);
    }
  };

  const handleUpdateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey) return;

    try {
      const updates = {
        user_name: formData.user_name,
        is_active: editingKey.is_active,
        expires_at: formData.expires_at || null
      };

      // Only allow changing key_value for non-admin keys
      if (!editingKey.is_admin) {
        updates.key_value = formData.key_value;
        updates.is_admin = formData.is_admin;
      }

      await updateApiKey(editingKey.id, updates);
      await loadAdminData();
      setEditingKey(null);
      setFormData({ key_value: '', user_name: '', is_admin: false, expires_at: '' });
    } catch (error: any) {
      alert(`Error updating key: ${error.message}`);
    }
  };

  const handleDeleteKey = async (key: ApiKey) => {
    if (key.is_admin) {
      alert('Cannot delete admin keys');
      return;
    }

    if (confirm(`Are you sure you want to delete the key for ${key.user_name}?`)) {
      try {
        await deleteApiKey(key.id);
        await loadAdminData();
      } catch (error: any) {
        alert(`Error deleting key: ${error.message}`);
      }
    }
  };

  const toggleKeyStatus = async (key: ApiKey) => {
    if (key.is_admin) {
      alert('Cannot deactivate admin keys');
      return;
    }

    try {
      await updateApiKey(key.id, { is_active: !key.is_active });
      await loadAdminData();
    } catch (error: any) {
      alert(`Error updating key status: ${error.message}`);
    }
  };

  const startEdit = (key: ApiKey) => {
    setEditingKey(key);
    setFormData({
      key_value: key.key_value,
      user_name: key.user_name,
      is_admin: key.is_admin,
      expires_at: key.expires_at ? key.expires_at.split('T')[0] : ''
    });
  };

  const togglePasswordVisibility = (keyId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!currentUser?.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Access Denied
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            You don't have permission to access the admin panel.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Loading admin panel...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
          <Button
            onClick={onBack}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm order-1 sm:order-none"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Generator
          </Button>
          <div className="order-2 sm:order-none">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <Shield className="h-8 w-8 text-red-600" />
              Admin Panel
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Manage API keys and monitor system usage
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg order-3 sm:order-none"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Key
        </Button>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total API Keys</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {apiKeys.length}
                </p>
              </div>
              <Key className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Keys</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {apiKeys.filter(k => k.is_active).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Admin Keys</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {apiKeys.filter(k => k.is_admin).length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingKey) && (
        <Card className="shadow-xl border-0 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              {editingKey ? <Edit className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
              {editingKey ? 'Edit API Key' : 'Create New API Key'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={editingKey ? handleUpdateKey : handleCreateKey} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="user_name">User Name *</Label>
                  <Input
                    id="user_name"
                    value={formData.user_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_name: e.target.value }))}
                    placeholder="Enter user name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="key_value">API Key *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="key_value"
                      value={formData.key_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, key_value: e.target.value }))}
                      placeholder="Enter or generate API key"
                      required
                      disabled={editingKey?.is_admin}
                    />
                    {!editingKey?.is_admin && (
                      <Button
                        type="button"
                        onClick={generateRandomKey}
                        variant="outline"
                        className="px-3"
                      >
                        Generate
                      </Button>
                    )}
                  </div>
                  {editingKey?.is_admin && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Admin key values cannot be changed
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires_at">Expiry Date (Optional)</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                  />
                </div>

                {!editingKey?.is_admin && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_admin"
                      checked={formData.is_admin}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_admin: e.target.checked }))}
                      className="rounded border-slate-300 dark:border-slate-600"
                    />
                    <Label htmlFor="is_admin">Admin Privileges</Label>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                >
                  {editingKey ? 'Update Key' : 'Create Key'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingKey(null);
                    setFormData({ key_value: '', user_name: '', is_admin: false, expires_at: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* API Keys Management */}
      <Card className="shadow-xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <Users className="h-6 w-6" />
            API Keys Management
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                  key.is_active
                    ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {key.user_name}
                      </h3>
                      {key.is_admin && (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full">
                          Admin
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        key.is_active
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {key.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2 overflow-hidden">
                      <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        {showPasswords[key.id] ? key.key_value : '•'.repeat(key.key_value.length)}
                      </span>
                      <Button
                        onClick={() => togglePasswordVisibility(key.id)}
                        variant="ghost"
                        size="sm"
                        className="p-1"
                      >
                        {showPasswords[key.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Created: {formatDate(key.created_at)}
                      </span>
                      {key.expires_at && (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          Expires: {formatDate(key.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
                    <Button
                      onClick={() => startEdit(key)}
                      variant="outline"
                      size="sm" 
                      className="flex-shrink-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    {!key.is_admin && (
                      <>
                        <Button
                          onClick={() => toggleKeyStatus(key)}
                          variant="outline"
                          size="sm"
                          className={`flex-shrink-0 ${key.is_active ? 'text-red-600' : 'text-emerald-600'}`}
                        >
                          {key.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        
                        <Button
                          onClick={() => handleDeleteKey(key)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
