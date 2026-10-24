import React, { useState } from 'react';
import { StoreSettings } from '../types';
import { StorageService } from '../services/storage';
import { hashPin, generateSalt } from '../utils/security';
import {
  SlidersHorizontal,
  Store,
  Lock,
  Download,
  Upload,
  Database,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  FileCode,
  Github
} from 'lucide-react';

interface SettingsModalProps {
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'backup' | 'firebase' | 'apk'>('profile');

  // Profile Form
  const [storeName, setStoreName] = useState(settings.storeName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // PIN Setup
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  // Backup & Restore
  const [importMessage, setImportMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.updateSettings({
      storeName: storeName.trim() || 'ইমন স্টোর',
      phone: phone.trim(),
      address: address.trim(),
    });
    setProfileSuccess(true);
    onRefresh();
    setTimeout(() => setProfileSuccess(false), 2000);
  };

  const handleSetNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (pinInput.length !== 4) {
      setPinError('পিন অবশ্যই ৪ সংখ্যার হতে হবে।');
      return;
    }
    if (pinInput !== pinConfirm) {
      setPinError('দুটো পিন নম্বর একই নয়। অনুগ্রহ করে মিলিয়ে নিন।');
      return;
    }

    const salt = generateSalt();
    const hash = await hashPin(pinInput, salt);
    StorageService.updateSettings({
      pinHash: hash,
      pinSalt: salt,
      isPinLocked: false,
    });

    setPinSuccess(true);
    setPinInput('');
    setPinConfirm('');
    onRefresh();
    setTimeout(() => setPinSuccess(false), 2500);
  };

  const handleRemovePin = () => {
    StorageService.updateSettings({
      pinHash: undefined,
      pinSalt: undefined,
      isPinLocked: false,
    });
    onRefresh();
  };

  const handleExportBackup = () => {
    const jsonStr = StorageService.exportFullBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `imon_store_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      const result = StorageService.importFullBackup(text);
      setImportMessage(result.message);
      if (result.success) {
        onRefresh();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">সেটিংস ও কন্ট্রোল প্যানেল</h3>
              <p className="text-[11px] text-slate-500">দোকানের তথ্য, পিন নিরাপত্তা, ব্যাকআপ ও APK বিল্ড</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100 dark:border-slate-800 text-xs font-bold">
          {[
            { id: 'profile', label: 'দোকান প্রোফাইল' },
            { id: 'security', label: 'পিন নিরাপত্তা' },
            { id: 'backup', label: 'ব্যাকআপ ও রিস্টোর' },
            { id: 'apk', label: 'Android APK বিল্ড' },
            { id: 'firebase', label: 'ফায়ারবেস ক্লাউড' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: Profile */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
            {profileSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>দোকানের তথ্য সফলভাবে আপডেট হয়েছে!</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">দোকানের নাম</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">যোগাযোগের ফোন নম্বর</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">দোকানের পূর্ণ ঠিকানা</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold"
              >
                প্রোফাইল সংরক্ষণ করুন
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Security & PIN */}
        {activeTab === 'security' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">৪-সংখ্যার অ্যাপ পিন স্ট্যাটাস</span>
                <span className="text-[11px] text-slate-500">
                  {settings.pinHash ? 'পিন সক্রিয় রয়েছে (SHA-256 এনক্রিপ্টেড)' : 'কোন পিন সেট করা নেই'}
                </span>
              </div>
              {settings.pinHash && (
                <button
                  onClick={handleRemovePin}
                  className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl font-bold text-[11px]"
                >
                  পিন বন্ধ করুন
                </button>
              )}
            </div>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {pinSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>নতুন পিন সফলভাবে সংরক্ষিত হয়েছে!</span>
              </div>
            )}

            <form onSubmit={handleSetNewPin} className="space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-200">
                {settings.pinHash ? 'পিন পরিবর্তন করুন:' : 'নতুন ৪-সংখ্যার পিন সেট করুন:'}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1">নতুন ৪-সংখ্যার পিন</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="****"
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center font-mono font-bold tracking-widest text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">পুনরায় পিন নিশ্চিত করুন</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="****"
                    value={pinConfirm}
                    onChange={e => setPinConfirm(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center font-mono font-bold tracking-widest text-sm"
                  />
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold"
                >
                  পিন সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: Backup & Restore */}
        {activeTab === 'backup' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 space-y-2">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-teal-600" />
                <h4 className="font-bold text-teal-950 dark:text-teal-200">সম্পূর্ণ দোকান ডাটাবেজ ব্যাকআপ</h4>
              </div>
              <p className="text-[11px] text-teal-900/80 dark:text-teal-300/80">
                পণ্য স্টক, গ্রাহকের বাকি খাতা, লেনদেন রেকর্ড, ভয়েস মেসেজ ও নোটসহ সম্পূর্ণ ডাটা একটি সুরক্ষিত JSON ফাইলে ডাউনলোড করে সংরক্ষণ করুন।
              </p>
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>এখনই ব্যাকআপ ফাইল ডাউনলোড করুন</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-800 dark:text-slate-200">ব্যাকআপ ফাইল থেকে ডাটা রিস্টোর</h4>
              </div>
              <p className="text-[11px] text-slate-500">
                পূর্বে সেভ করা JSON ব্যাকআপ ফাইল নির্বাচন করে হিসাব পুনরুদ্ধার করুন।
              </p>

              {importMessage && (
                <div className="p-2 rounded-lg bg-teal-100 text-teal-900 font-semibold text-[11px]">
                  {importMessage}
                </div>
              )}

              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              />
            </div>
          </div>
        )}

        {/* TAB 4: Android APK Build Guide */}
        {activeTab === 'apk' && (
          <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-300 dark:border-emerald-800 space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-slate-900 dark:text-white">অ্যান্ড্রয়েড APK বিল্ড আর্কিটেকচার</h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                ইমন স্টোর অ্যাপটি ক্যাপাসিটর (Capacitor) এবং নেটিভ অ্যান্ড্রয়েড ফ্রেমওয়ার্কের মাধ্যমে সম্পূর্ণ প্যাকেজ করা হয়েছে।
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">অ্যাপ আইডি:</span>
                <span className="font-bold text-teal-600">com.imonstore.app</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">অ্যাপের নাম:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">ইমন স্টোর</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">অনুমতিসমূহ (Permissions):</span>
                <span>INTERNET, RECORD_AUDIO, CAMERA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GitHub Actions ওয়ার্কফ্লো:</span>
                <span className="text-indigo-600">.github/workflows/android-apk.yml</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-1.5">
              <h5 className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <Github className="w-4 h-4 text-indigo-600" />
                <span>GitHub Actions থেকে সরাসরি APK ডাউনলোড করার নিয়ম:</span>
              </h5>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-indigo-900/80 dark:text-indigo-300/80">
                <li>আপনার গিটহাবে পুশ করার সাথে সাথে অটোমেটিক বিল্ড শুরু হবে।</li>
                <li>গিটহাব রিপোজিটরির <b>Actions</b> ট্যাবে যান।</li>
                <li>সর্বশেষ <b>Build Android Debug & Release APK</b> রান-এ ক্লিক করুন।</li>
                <li>নিচে <b>Artifacts</b> সেকশনে <b>imon-store-debug-apk</b> জিপ ফাইল পেয়ে যাবেন। ডাউনলোড করে ফোনে ইনস্টল করুন।</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 5: Firebase Cloud Setup Status */}
        {activeTab === 'firebase' && (
          <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900 space-y-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-amber-600" />
                <h4 className="font-bold text-amber-900 dark:text-amber-200">ফায়ারবেস ক্লাউড ও সিকিউরিটি রুলস</h4>
              </div>
              <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80">
                অ্যাপে ক্লাউড ফায়ারস্টোর ও সিকিউরিটি রুলস তৈরি করা হয়েছে (`firestore.rules` ও `firebase-blueprint.json`)।
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-[11px]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>ABAC সিকিউরিটি রুলস: <b>সম্পূর্ণ কনফিগার করা</b></span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>ডাটাবেজ ব্লুপ্রিন্ট IR: <b>firebase-blueprint.json</b></span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>অফলাইন-ফার্স্ট ক্যাশ ও রেসপনসিভনেস: <b>সক্রিয়</b></span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
