import React, { useState, useEffect, useRef } from 'react';
import { Customer, ParsedVoiceCommand } from '../types';
import { parseVoiceCommand, speakBengali } from '../utils/voice';
import { formatTaka, toBengaliNumber } from '../utils/formatters';
import { StorageService } from '../services/storage';
import {
  Mic,
  Square,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Volume2,
  RotateCcw,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

interface VoiceAssistantModalProps {
  customers: Customer[];
  isOpen: boolean;
  onClose: () => void;
  onExecuteTransaction: (params: {
    type: 'credit_sale_given' | 'credit_payment_collected' | 'cash_sale';
    customerId?: string;
    customerName?: string;
    amount: number;
    description: string;
  }) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  customers,
  isOpen,
  onClose,
  onExecuteTransaction,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedCommand, setParsedCommand] = useState<ParsedVoiceCommand | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSpeechSupported(false);
      }
    }
  }, []);

  const handleStartListening = () => {
    setExecutionMessage(null);
    setParsedCommand(null);
    setTranscript('');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'bn-BD';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        if (event.results[0].isFinal) {
          const parsed = parseVoiceCommand(currentTranscript, customers);
          setParsedCommand(parsed);
          setIsListening(false);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Test with preset sample commands
  const handleTestSample = (sample: string) => {
    setTranscript(sample);
    const parsed = parseVoiceCommand(sample, customers);
    setParsedCommand(parsed);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setTranscript(manualInput);
    const parsed = parseVoiceCommand(manualInput, customers);
    setParsedCommand(parsed);
    setManualInput('');
  };

  // CRITICAL REQUIREMENT: User must explicitly confirm before executing financial write!
  const handleConfirmAndExecute = () => {
    if (!parsedCommand || !parsedCommand.isValid) return;

    if (parsedCommand.action === 'query_sales') {
      const todayStr = new Date().toISOString().split('T')[0];
      const todaySales = StorageService.getTransactions()
        .filter(t => t.timestamp.startsWith(todayStr) && (t.type === 'cash_sale' || t.type === 'credit_sale_given'))
        .reduce((sum, t) => sum + t.amount, 0);

      const reply = `আজকের মোট বিক্রির পরিমাণ ${todaySales} টাকা।`;
      speakBengali(reply);
      setExecutionMessage(reply);
      return;
    }

    if (parsedCommand.action === 'query_customer_due') {
      const cust = customers.find(c => c.id === parsedCommand.matchedCustomerId);
      const dues = cust ? cust.currentBalance : 0;
      const reply = `${parsedCommand.customerName || 'কাস্টমার'}-এর বর্তমান মোট বাকি ${dues} টাকা।`;
      speakBengali(reply);
      setExecutionMessage(reply);
      return;
    }

    if (parsedCommand.amount && (parsedCommand.action === 'credit_sale_given' || parsedCommand.action === 'credit_payment_collected' || parsedCommand.action === 'cash_sale')) {
      onExecuteTransaction({
        type: parsedCommand.action,
        customerId: parsedCommand.matchedCustomerId,
        customerName: parsedCommand.customerName,
        amount: parsedCommand.amount,
        description: `ভয়েস হিসাব: "${parsedCommand.rawTranscript}"`,
      });

      const replyText = `${parsedCommand.amount} টাকা সফলভাবে খাতা ও লেজারে লিপিবদ্ধ করা হয়েছে।`;
      speakBengali(replyText);
      setExecutionMessage(replyText);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">বাংলা ভয়েস হিসাব সহকারী</h3>
              <p className="text-[11px] text-slate-500">কথা বলুন অথবা লিখে হিসাব যাচাই করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Microphone Pulse & Status */}
        <div className="text-center py-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="relative inline-block">
            {isListening && (
              <span className="absolute -inset-3 rounded-full bg-teal-500/30 animate-ping" />
            )}
            <button
              onClick={isListening ? handleStopListening : handleStartListening}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-teal-600 hover:bg-teal-500 text-white'
              }`}
            >
              {isListening ? <Square className="w-8 h-8" /> : <Mic className="w-9 h-9" />}
            </button>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isListening ? 'শুনছি... এখন কথা বলুন' : 'মাইক্রোফোনে ক্লিক করে কথা বলুন'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              ভাষা: বাংলা (বাংলাদেশ) | Web Speech API
            </p>
          </div>

          {transcript && (
            <div className="p-3 mx-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
              &ldquo;{transcript}&rdquo;
            </div>
          )}
        </div>

        {/* Browser limitation fallback message */}
        {!isSpeechSupported && (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>আপনার ব্রাউজারে স্পিচ রিকগনিশন সক্রিয় নেই। নিচের ইনপুট বক্সে লিখেও ভয়েস কমান্ড পরীক্ষা করতে পারেন।</span>
          </div>
        )}

        {/* Parsed Command Confirmation Card (CRITICAL) */}
        {parsedCommand && (
          <div className={`p-4 rounded-2xl border transition-all ${
            parsedCommand.isValid
              ? 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-300 dark:border-teal-900/60'
              : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">যাচাইকৃত কমান্ড বিবরণ:</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                parsedCommand.isValid ? 'bg-teal-200 dark:bg-teal-900 text-teal-800 dark:text-teal-200' : 'bg-rose-200 text-rose-800'
              }`}>
                {parsedCommand.isValid ? 'সঠিক সনাক্তকরণ' : 'অনিশ্চিত'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">কাজের ধরন:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {parsedCommand.action === 'credit_sale_given' ? 'বাকি দিলাম' :
                   parsedCommand.action === 'credit_payment_collected' ? 'বাকি পেলাম (আদায়)' :
                   parsedCommand.action === 'cash_sale' ? 'নগদ বিক্রি' :
                   parsedCommand.action === 'query_sales' ? 'বিক্রি অনুসন্ধান' :
                   parsedCommand.action === 'query_customer_due' ? 'বাকি অনুসন্ধান' : 'অজানা'}
                </span>
              </div>

              {parsedCommand.customerName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">কাস্টমার:</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">
                    {parsedCommand.customerName}
                  </span>
                </div>
              )}

              {parsedCommand.amount && (
                <div className="flex justify-between">
                  <span className="text-slate-500">টাকার পরিমাণ:</span>
                  <span className="font-bold text-base text-rose-600 dark:text-rose-400">
                    {formatTaka(parsedCommand.amount)}
                  </span>
                </div>
              )}

              <p className="text-[11px] text-slate-600 dark:text-slate-400 italic pt-1">
                {parsedCommand.description}
              </p>
            </div>

            {/* Confirmation CTA */}
            {parsedCommand.isValid && (
              <div className="mt-4 pt-3 border-t border-teal-200 dark:border-teal-900/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setParsedCommand(null)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndExecute}
                  className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>হ্যাঁ, নিশ্চিত ও খাতা আপডেট করুন</span>
                </button>
              </div>
            )}
          </div>
        )}

        {executionMessage && (
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            <span>{executionMessage}</span>
          </div>
        )}

        {/* Sample Voice Commands */}
        <div className="space-y-1.5 pt-2">
          <span className="text-[11px] font-bold text-slate-500 block">উদাহরণ কমান্ড টেস্ট করুন:</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              'রহিমের নামে একশ টাকা বাকি লিখো',
              'করিম পঞ্চাশ টাকা দিয়েছে',
              'আজকের মোট বিক্রি কত?',
              'রহিমের মোট বাকি কত?',
            ].map((sample, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleTestSample(sample)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-teal-100 dark:hover:bg-teal-950 transition-colors"
              >
                &ldquo;{sample}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Manual Fallback Input Form */}
        <form onSubmit={handleManualSubmit} className="pt-2 flex gap-2">
          <input
            type="text"
            placeholder="কমান্ড লিখুন (যেমন: রহিমের নামে ৫০ টাকা বাকি লিখো)"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            className="flex-1 p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
          >
            যাচাই
          </button>
        </form>
      </div>
    </div>
  );
};
