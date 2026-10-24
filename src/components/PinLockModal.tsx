import React, { useState } from 'react';
import { StoreSettings } from '../types';
import { verifyPin, hashPin, generateSalt } from '../utils/security';
import { StorageService } from '../services/storage';
import { Lock, Unlock, KeyRound, ShieldCheck, AlertCircle, Phone, CheckCircle2 } from 'lucide-react';

interface PinLockModalProps {
  settings: StoreSettings;
  isOpen: boolean;
  onSuccess: () => void;
  onRefreshSettings: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  settings,
  isOpen,
  onSuccess,
  onRefreshSettings,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = (num: number) => {
    if (pin.length < 4) {
      const next = pin + num;
      setPin(next);
      setError(null);

      if (next.length === 4) {
        handleVerify(next);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleVerify = async (enteredPin: string) => {
    if (!settings.pinHash || !settings.pinSalt) {
      onSuccess();
      return;
    }

    const isValid = await verifyPin(enteredPin, settings.pinHash, settings.pinSalt);
    if (isValid) {
      setPin('');
      setError(null);
      onSuccess();
    } else {
      setError('ভুল পিন নম্বর! আবার চেষ্টা করুন।');
      setPin('');
    }
  };

  const handleSendRecoveryOtp = () => {
    setOtpSent(true);
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp !== '1234' && enteredOtp.length !== 4) {
      setError('অকার্যকর ওটিপি কোড। অনুগ্রহ করে সঠিক কোড দিন।');
      return;
    }

    if (newPin.length !== 4) {
      setError('নতুন পিন অবশ্যই ৪ সংখ্যার হতে হবে।');
      return;
    }

    const salt = generateSalt();
    const hash = await hashPin(newPin, salt);
    StorageService.updateSettings({ pinHash: hash, pinSalt: salt });
    setRecoverySuccess(true);
    onRefreshSettings();
    setTimeout(() => {
      setRecoverySuccess(false);
      setIsForgotMode(false);
      onSuccess();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        {!isForgotMode ? (
          <>
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950 border border-teal-500/30 text-teal-600 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">ইমন স্টোর অ্যাপ লক</h2>
              <p className="text-xs text-slate-500">আপনার ৪-ডিজিটের গোপন পিন নম্বর প্রবেশ করান</p>
            </div>

            {/* PIN Dots */}
            <div className="flex justify-center gap-4 py-2">
              {[0, 1, 2, 3].map(idx => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    idx < pin.length
                      ? 'bg-teal-600 border-teal-600 scale-125'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/60 p-2 rounded-xl">
                {error}
              </div>
            )}

            {/* Bengali Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-slate-900 dark:text-white font-bold text-xl active:scale-95 transition-all shadow-xs border border-slate-200 dark:border-slate-700/60"
                >
                  {['১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'][num - 1]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsForgotMode(true)}
                className="h-14 rounded-2xl text-[11px] font-bold text-slate-500 hover:text-teal-600"
              >
                পিন ভুলে গেছেন?
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress(0)}
                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-slate-900 dark:text-white font-bold text-xl active:scale-95 transition-all shadow-xs border border-slate-200 dark:border-slate-700/60"
              >
                ০
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-14 rounded-2xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
              >
                মুছুন
              </button>
            </div>
          </>
        ) : (
          /* Forgot PIN / Recovery via Phone OTP */
          <div className="space-y-4 text-left">
            <div className="text-center space-y-1">
              <KeyRound className="w-10 h-10 text-teal-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">পিন উদ্ধার ও পরিবর্তন</h3>
              <p className="text-xs text-slate-500">
                দোকানদারের নিবন্ধিত নম্বর ({settings.phone || '০১৭১১-২৩৪৫৬৭'})-এ ওটিপি কোড পাঠানো হবে।
              </p>
            </div>

            {recoverySuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>নতুন পিন সফলভাবে সংরক্ষিত হয়েছে!</span>
              </div>
            )}

            {!otpSent ? (
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleSendRecoveryOtp}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  ফোনে OTP কোড পাঠান
                </button>
                <button
                  onClick={() => setIsForgotMode(false)}
                  className="w-full py-2 text-xs text-slate-500 text-center"
                >
                  ফিরে যান
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPin} className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    মোবাইলে প্রাপ্ত ৪-সংখ্যার OTP (টেস্ট কোড: 1234)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="1234"
                    value={enteredOtp}
                    onChange={e => setEnteredOtp(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center font-mono font-bold tracking-widest text-base"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    নতুন ৪-সংখ্যার পিন
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="যেমন: 4321"
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center font-mono font-bold tracking-widest text-base"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotMode(false)}
                    className="flex-1 py-2 text-slate-600 rounded-xl"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-teal-600 text-white font-bold rounded-xl"
                  >
                    পিন নিশ্চিত করুন
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
