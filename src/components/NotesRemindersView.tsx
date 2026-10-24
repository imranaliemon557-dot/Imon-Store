import React, { useState } from 'react';
import { ShopNote } from '../types';
import { StorageService } from '../services/storage';
import { formatDhakaDateTime, toBengaliNumber } from '../utils/formatters';
import {
  StickyNote,
  Plus,
  Trash2,
  Calendar,
  Lock,
  Search,
  CheckCircle2,
  X,
  AlertCircle
} from 'lucide-react';

interface NotesRemindersViewProps {
  notes: ShopNote[];
  onRefresh: () => void;
}

export const NotesRemindersView: React.FC<NotesRemindersViewProps> = ({
  notes,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<'shop' | 'product' | 'customer'>('shop');
  const [reminderDate, setReminderDate] = useState('');

  const filteredNotes = notes.filter(n => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  });

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    StorageService.saveNote({
      storeId: 'store_imon_main',
      targetType,
      title: title.trim(),
      content: content.trim(),
      isPrivate: true,
      reminderDate: reminderDate || undefined,
    });

    setIsAddModalOpen(false);
    setTitle('');
    setContent('');
    setReminderDate('');
    onRefresh();
  };

  const handleDelete = (id: string) => {
    StorageService.deleteNote(id);
    onRefresh();
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>নোট ও রিমাইন্ডার</span>
            <span className="text-xs bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-2.5 py-0.5 rounded-full font-semibold">
              {toBengaliNumber(notes.length)} টি নোট
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            দোকানের পাইকারি অর্ডার, বকেয়া তাগাদা ও ব্যক্তিগত হিসাবের নোট
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-sm transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন নোট তৈরি</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredNotes.map(note => (
          <div
            key={note.id}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                  {note.title}
                </h3>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
                {note.content}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-500" />
                গোপন নোট
              </span>
              <span>{formatDhakaDateTime(note.createdAt).split(',')[0]}</span>
            </div>
          </div>
        ))}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">নতুন নোট লিখুন</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  নোটের শিরোনাম *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মৌলভীবাজার থেকে তেল আনা"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  নোটের বিবরণ *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="বিস্তারিত নোট লিখুন..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 text-white rounded-xl font-bold"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
