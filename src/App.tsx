import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/LoginForm';
import ProxyGenerator from './components/ProxyGenerator';
import AdminPanel from './components/AdminPanel';
import UserProfile from './components/UserProfile';

function AppContent() {
  const { currentUser, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<'generator' | 'profile' | 'admin'>('generator');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg">Loading application...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {currentView === 'generator' && (
          <ProxyGenerator
            onShowProfile={() => setCurrentView('profile')}
            onShowAdmin={() => setCurrentView('admin')}
          />
        )}
        {currentView === 'profile' && (
          <UserProfile onBack={() => setCurrentView('generator')} />
        )}
        {currentView === 'admin' && (
          <AdminPanel onBack={() => setCurrentView('generator')} />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;