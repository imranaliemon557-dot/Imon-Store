import React, { useState, useEffect, useRef } from 'react';
import { Customer, LedgerTransaction, StoreSettings } from '../types';
import { StorageService } from '../services/storage';
import { formatTaka, toBengaliNumber, formatDhakaDateTime, getBengaliTransactionTypeName } from '../utils/formatters';
import {
  Store,
  ShieldCheck,
  Phone,
  Calendar,
  Receipt,
  Mic,
  Square,
  Send,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  Printer
} from 'lucide-react';

interface CustomerStatementViewProps {
  shareToken: string;
  onClose?: () => void;
  isShopOwnerPreview?: boolean;
}

export const CustomerStatementView: React.FC<CustomerStatementViewProps> = ({
  shareToken,
  onClose,
  isShopOwnerPreview = false,
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<LedgerTransaction[]>([]);
  const [isValidToken, setIsValidToken] = useState(true);

  // Message & Voice Recording State
  const [supportText, setSupportText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [messageSentSuccess, setMessageSentSuccess] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    StorageService.init();
    const storeSettings = StorageService.getSettings();
    setSettings(storeSettings);

    const matchedCustomer = StorageService.getCustomerByShareToken(shareToken);
    if (!matchedCustomer) {
      setIsValidToken(false);
      return;
    }

    setCustomer(matchedCustomer);

    // Fetch ONLY transactions belonging to this customer
    const allTx = StorageService.getTransactions();
    const custTx = allTx.filter(t => t.customerId === matchedCustomer.id);
    setCustomerTransactions(custTx);
  }, [shareToken]);

  // Voice recording controls
  const handleStartRecording = async () => {
    setMessageError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMessageError('আপনার ডিভাইসে মাইক্রোফোন সুবিধা পাওয়া যায়নি।');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = e => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // Max 5MB size validation
        if (audioBlob.size > 5 * 1024 * 1024) {
          setMessageError('অডিও ফাইলটির আকার সর্বোচ্চ ৫ মেগাবাইট হতে পারবে।');
          return;
        }
        setRecordedAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 120) {
            handleStopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setMessageError('মাইক্রোফোন ব্যবহারের অনুমতি পাওয়া যায়নি। দয়া করে অনুমতি দিন।');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const handleSendMessage = () => {
    if (!customer) return;
    if (!supportText.trim() && !recordedAudioBlob) {
      setMessageError('দয়া করে কোনো বার্তা লিখুন অথবা ভয়েস মেসেজ রেকর্ড করুন।');
      return;
    }

    try {
      let voiceUrl: string | undefined;
      if (recordedAudioBlob) {
        voiceUrl = URL.createObjectURL(recordedAudioBlob);
      }

      StorageService.addSupportMessage({
        storeId: 'store_imon_main',
        customerId: customer.id,
        customerName: customer.name,
        senderType: 'customer',
        messageType: recordedAudioBlob ? 'voice' : 'text',
        text: supportText.trim() || undefined,
        voiceUrl,
        durationSeconds: recordingSeconds,
        isRead: false,
      });

      setMessageSentSuccess(true);
      setSupportText('');
      setRecordedAudioBlob(null);
      setRecordingSeconds(0);
      setTimeout(() => setMessageSentSuccess(false), 4000);
    } catch {
      setMessageError('মেসেজ পাঠাতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
    }
  };

  if (!isValidToken || !customer) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 text-center shadow-xl border border-rose-200 dark:border-rose-950 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">স্টেটমেন্ট লিংকটি সঠিক নয়</h2>
          <p className="text-xs text-slate-500">
            এই স্টেটমেন্ট লিংকটির মেয়াদ শেষ হয়ে গেছে অথবা দোকানদার কর্তৃক নতুন টোকেন তৈরি করা হয়েছে। অনুগ্রহ করে দোকানদারের সাথে যোগাযোগ করে নতুন লিংক নিন।
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-4 px-5 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl"
            >
              ফিরে যান
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-3 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Moral Message Banner - MANDATORY REQUIREMENT */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 text-white shadow-md text-center">
          <p className="text-xs sm:text-sm font-semibold tracking-wide text-teal-100">
            &ldquo;এক হাজার টাকা দান করার চেয়ে এক টাকা ঋণ পরিশোধ করা উত্তম।&rdquo;
          </p>
        </div>

        {/* Shop Owner Preview Header Notice */}
        {isShopOwnerPreview && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
            <div className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>দোকানদার প্রিভিউ মোড (কাস্টমার যেভাবে দেখবেন)</span>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1 bg-amber-600 text-white font-bold rounded-lg text-[11px]"
              >
                প্রিভিউ বন্ধ করুন
              </button>
            )}
          </div>
        )}

        {/* Store & Customer Identity Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 border border-teal-500/30 flex items-center justify-center text-teal-600">
                <Store className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {settings?.storeName || 'ইমন স্টোর'}
                </h1>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-teal-600" />
                  <span>দোকানের ফোন: {settings?.phone || '০১৭১১-২৩৪৫৬৭'}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="প্রিন্ট করুন"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>

          {/* Customer Dues Callout */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-slate-500 block">সম্মানিত গ্রাহক:</span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{customer.name}</h2>
              <span className="text-xs text-slate-400 font-mono">{customer.phone}</span>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 block">বর্তমান মোট বাকি পাওনা:</span>
              <p className={`text-2xl font-black tracking-tight ${customer.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatTaka(customer.currentBalance)}
              </p>
            </div>
          </div>
        </div>

        {/* Customer Statement Transactions Ledger */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-teal-600" />
              <span>হিসাব বিবরণী (খাতা স্টেটমেন্ট)</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              মোট {toBengaliNumber(customerTransactions.length)} টি এন্ট্রি
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {customerTransactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                কোন পূর্বের হিসাব রেকর্ড নেই।
              </div>
            ) : (
              customerTransactions.map(tx => {
                const isCreditGiven = tx.type === 'credit_sale_given';
                const isPayment = tx.type === 'credit_payment_collected' || tx.type === 'partial_payment';

                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCreditGiven ? 'bg-rose-50 text-rose-600 dark:bg-rose-950' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950'
                      }`}>
                        {isCreditGiven ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {isCreditGiven ? 'বাকিতে ক্রয়' : 'টাকা পরিশোধ (জমা)'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDhakaDateTime(tx.timestamp)}
                          </span>
                        </div>

                        <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                          {tx.description || (tx.items?.map(it => `${it.productName} (${toBengaliNumber(it.quantity)} ${it.unit})`).join(', ') || 'পণ্য ক্রয়')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${isCreditGiven ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isCreditGiven ? '+' : '-'}{formatTaka(tx.amount)}
                      </p>
                      <span className="text-[10px] text-slate-400 block">
                        অবশিষ্ট: {formatTaka(tx.newBalance)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Customer Support & Voice Message Box */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-teal-600" />
              <span>দোকানদারকে মেসেজ বা ভয়েস নোট পাঠান</span>
            </h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
              সরাসরি যোগাযোগ
            </span>
          </div>

          <p className="text-xs text-slate-500">
            হিসাব সংক্রান্ত কোনো প্রশ্ন বা মন্তব্য থাকলে নিচে লিখে অথবা ভয়েস রেকর্ড করে দোকানদারকে পাঠাতে পারেন।
          </p>

          {messageError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{messageError}</span>
            </div>
          )}

          {messageSentSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>আপনার বার্তাটি সফলভাবে দোকানদারের ইনবক্সে পৌঁছেছে!</span>
            </div>
          )}

          <div className="space-y-2">
            <textarea
              rows={2}
              placeholder="এখানে আপনার মেসেজ লিখুন..."
              value={supportText}
              onChange={e => setSupportText(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500"
            />

            {/* Voice Recording Controls */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Mic className="w-4 h-4 text-rose-600" />
                    <span>ভয়েস রেকর্ড করুন</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold animate-pulse"
                  >
                    <Square className="w-4 h-4" />
                    <span>রেকর্ড থামান ({toBengaliNumber(recordingSeconds)} সে.)</span>
                  </button>
                )}

                {recordedAudioBlob && !isRecording && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ভয়েস নোট প্রস্তুত
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSendMessage}
                className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>মেসেজ পাঠান</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security and Privacy Assurance */}
        <div className="text-center text-[11px] text-slate-400 py-4 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>ইমন স্টোর সুরক্ষিত ক্লাউড খাতা দ্বারা পরিচালিত। তথ্য সম্পূর্ণ নিরাপদ।</span>
        </div>
      </div>
    </div>
  );
};
