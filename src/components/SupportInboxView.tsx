import React, { useState } from 'react';
import { SupportMessage } from '../types';
import { StorageService } from '../services/storage';
import { formatDhakaDateTime, toBengaliNumber } from '../utils/formatters';
import {
  MessageSquare,
  Mic,
  Play,
  Pause,
  CheckCircle2,
  Trash2,
  Send,
  User,
  ShieldAlert
} from 'lucide-react';

interface SupportInboxViewProps {
  messages: SupportMessage[];
  onRefresh: () => void;
}

export const SupportInboxView: React.FC<SupportInboxViewProps> = ({
  messages,
  onRefresh,
}) => {
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handlePlayVoice = (msgId: string, url: string) => {
    if (playingMsgId === msgId && audioRef.current) {
      audioRef.current.pause();
      setPlayingMsgId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingMsgId(null);
    audio.play().catch(e => console.warn('Audio play failed', e));
    setPlayingMsgId(msgId);
    StorageService.markMessageRead(msgId);
  };

  const handleSendReply = (customerId: string, customerName: string) => {
    const text = replyText[customerId];
    if (!text || !text.trim()) return;

    StorageService.addSupportMessage({
      storeId: 'store_imon_main',
      customerId,
      customerName,
      senderType: 'owner',
      messageType: 'text',
      text: text.trim(),
      isRead: true,
    });

    setReplyText(prev => ({ ...prev, [customerId]: '' }));
    setActiveReplyId(null);
    onRefresh();
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>গ্রাহক মেসেজ ও ভয়েস ইনবক্স</span>
            <span className="text-xs bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-2.5 py-0.5 rounded-full font-semibold">
              {toBengaliNumber(messages.length)} টি বার্তা
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            স্টেটমেন্ট লিংক থেকে কাস্টমারদের পাঠানো টেক্সট এবং রেকর্ড করা ভয়েস বার্তা
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {messages.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">ইনবক্স সম্পূর্ণ খালি</h4>
            <p className="text-xs text-slate-500 mt-1">
              কাস্টমার তাদের শেয়ারযোগ্য স্টেটমেন্ট থেকে মেসেজ পাঠালে তা এখানে সরাসরি জমা হবে।
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`p-4 rounded-2xl border transition-all bg-white dark:bg-slate-900 space-y-3 ${
                !msg.isRead
                  ? 'border-teal-400 dark:border-teal-800 bg-teal-50/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    msg.senderType === 'owner' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                  }`}>
                    {msg.senderType === 'owner' ? <ShieldAlert className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {msg.customerName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({msg.senderType === 'owner' ? 'দোকানদার জবাব' : 'কাস্টমার'})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {formatDhakaDateTime(msg.timestamp)}
                    </span>
                  </div>
                </div>

                {!msg.isRead && (
                  <button
                    onClick={() => {
                      StorageService.markMessageRead(msg.id);
                      onRefresh();
                    }}
                    className="text-[11px] font-semibold text-teal-600 hover:underline"
                  >
                    পড়া হয়েছে
                  </button>
                )}
              </div>

              {/* Message Content */}
              {msg.messageType === 'voice' && msg.voiceUrl ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePlayVoice(msg.id, msg.voiceUrl!)}
                      className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center hover:bg-teal-500 transition-colors"
                    >
                      {playingMsgId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <div className="text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">ভয়েস মেসেজ</span>
                      <span className="text-slate-400 block text-[10px]">
                        দৈর্ঘ্য: {toBengaliNumber(msg.durationSeconds || 0)} সেকেন্ড
                      </span>
                    </div>
                  </div>
                  <Mic className="w-4 h-4 text-teal-600" />
                </div>
              ) : (
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {msg.text}
                </p>
              )}

              {/* Quick Reply Form */}
              {msg.senderType === 'customer' && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  {activeReplyId === msg.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="কাস্টমারকে উত্তর লিখুন..."
                        value={replyText[msg.customerId] || ''}
                        onChange={e => setReplyText(prev => ({ ...prev, [msg.customerId]: e.target.value }))}
                        className="flex-1 p-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500"
                      />
                      <button
                        onClick={() => handleSendReply(msg.customerId, msg.customerName)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>পাঠান</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveReplyId(msg.id)}
                      className="text-xs font-bold text-teal-600 hover:underline"
                    >
                      + উত্তর দিন
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
