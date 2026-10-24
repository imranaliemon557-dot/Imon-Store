import React, { useState, useEffect } from 'react';
import { StoreSettings } from '../types';
import { StorageService } from '../services/storage';
import { formatDhakaDateTime } from '../utils/formatters';
import {
  Store,
  Lock,
  Moon,
  Sun,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
  Bell
} from 'lucide-react';

interface HeaderProps {
  settings: StoreSettings;
  onOpenSettings: () => void;
  onLockPin: () => void;
  lowStockCount: number;
  unreadMessagesCount: number;
  onOpenInbox: () => void;
  onOpenInventory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  onLockPin,
  lowStockCount,
  unreadMessagesCount,
  onOpenInbox,
  onOpenInventory,
}) => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date().toISOString());
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
      StorageService.updateSettings({ theme: 'light' });
    } else {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
      StorageService.updateSettings({ theme: 'dark' });
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-teal-800 text-white shadow-md border-b border-teal-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand & Store Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-700/80 border border-teal-500/50 flex items-center justify-center shadow-inner text-amber-300">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                {settings.storeName || 'ইমন স্টোর'}
              </h1>
              <span className="text-[10px] bg-teal-900/90 text-teal-200 px-2 py-0.5 rounded-full font-medium border border-teal-600/50">
                ডিজিটাল খাতা
              </span>
            </div>
            <p className="text-xs text-teal-200/90 hidden sm:block">
              {formatDhakaDateTime(currentDateTime)} (ঢাকা সময়)
            </p>
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Low Stock Alert Button */}
          {lowStockCount > 0 && (
            <button
              onClick={onOpenInventory}
              title="কম স্টক সতর্কতা"
              className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs px-2.5 py-1.5 rounded-lg transition-all animate-pulse"
            >
              <Bell className="w-4 h-4 text-amber-300" />
              <span className="font-semibold">{lowStockCount} কম</span>
            </button>
          )}

          {/* Unread Message Inbox */}
          <button
            onClick={onOpenInbox}
            title="গ্রাহক মেসেজ ও ভয়েস ইনবক্স"
            className="relative p-2 rounded-lg bg-teal-700/50 hover:bg-teal-700 text-teal-100 transition-colors"
          >
            <ShieldCheck className="w-5 h-5 text-teal-200" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? 'লাইট মোড চালু করুন' : 'ডার্ক মোড চালু করুন'}
            className="p-2 rounded-lg bg-teal-700/50 hover:bg-teal-700 text-teal-100 transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-teal-200" />}
          </button>

          {/* PIN Lock Trigger */}
          {settings.pinHash && (
            <button
              onClick={onLockPin}
              title="অ্যাপ লক করুন"
              className="p-2 rounded-lg bg-teal-700/50 hover:bg-teal-700 text-teal-100 transition-colors"
            >
              <Lock className="w-5 h-5 text-emerald-300" />
            </button>
          )}

          {/* Settings Modal */}
          <button
            onClick={onOpenSettings}
            title="সেটিংস ও ব্যাকআপ"
            className="p-2 rounded-lg bg-teal-700/50 hover:bg-teal-700 text-teal-100 transition-colors"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
