import React, { useEffect } from 'react';
import { Button } from './ui/button';
import { 
  X, 
  User, 
  Shield, 
  Sun, 
  Moon, 
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onShowProfile: () => void;
  onShowAdmin: () => void;
  toggleTheme: () => void;
  theme: 'light' | 'dark';
  mounted: boolean;
}

export default function MobileMenu({ 
  isOpen, 
  onClose, 
  onShowProfile, 
  onShowAdmin, 
  toggleTheme, 
  theme, 
  mounted 
}: MobileMenuProps) {
  const { currentUser, logout } = useAuth();

  // Close menu on escape key press
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleMenuItemClick = (action: () => void) => {
    action();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Menu Drawer */}
      <div className="fixed right-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                {currentUser?.user_name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentUser?.is_admin ? 'Administrator' : 'User'}
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Menu Items */}
        <div className="p-6 space-y-2">
          {/* Profile Button */}
          <Button
            onClick={() => handleMenuItemClick(onShowProfile)}
            variant="ghost"
            className="w-full justify-start h-12 text-left bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
          >
            <User className="h-5 w-5 mr-3 text-blue-600 dark:text-blue-400" />
            <span className="text-slate-700 dark:text-slate-200">Profile</span>
          </Button>

          {/* Admin Panel Button (only for admins) */}
          {currentUser?.is_admin && (
            <Button
              onClick={() => handleMenuItemClick(onShowAdmin)}
              variant="ghost"
              className="w-full justify-start h-12 text-left bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
            >
              <Shield className="h-5 w-5 mr-3 text-red-600 dark:text-red-400" />
              <span className="text-slate-700 dark:text-slate-200">Admin Panel</span>
            </Button>
          )}

          {/* Theme Toggle Button */}
          <Button
            onClick={() => handleMenuItemClick(toggleTheme)}
            variant="ghost"
            className="w-full justify-start h-12 text-left bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
            disabled={!mounted}
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-5 w-5 mr-3 text-amber-500" />
            ) : (
              <Moon className="h-5 w-5 mr-3 text-slate-600 dark:text-slate-300" />
            )}
            <span className="text-slate-700 dark:text-slate-200">
              {mounted ? (theme === "dark" ? "Light Mode" : "Dark Mode") : "Loading..."}
            </span>
          </Button>

          {/* Divider */}
          <div className="border-t border-slate-200 dark:border-slate-700 my-4" />

          {/* Logout Button */}
          <Button
            onClick={() => handleMenuItemClick(logout)}
            variant="ghost"
            className="w-full justify-start h-12 text-left bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 text-red-600 dark:text-red-400"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span>Logout</span>
          </Button>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-200 dark:border-slate-700">
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              IP GEN PRO
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Unlimited IP Generator
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
