import React, { useState, useMemo } from 'react';
import { Customer, LedgerTransaction, ProductItem } from '../types';
import { formatTaka, toBengaliNumber, formatDhakaDate } from '../utils/formatters';
import { BarChart3, Calendar, Download, Printer, X, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface ReportsModalProps {
  transactions: LedgerTransaction[];
  products: ProductItem[];
  customers: Customer[];
  isOpen: boolean;
  onClose: () => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({
  transactions,
  products,
  customers,
  isOpen,
  onClose,
}) => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const filteredTx = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const txDate = new Date(t.timestamp);
      if (period === 'today') {
        return txDate.toDateString() === now.toDateString();
      }
      if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return txDate >= weekAgo;
      }
      if (period === 'month') {
        const monthAgo = new Date();
        monthAgo.setDate(now.getDate() - 30);
        return txDate >= monthAgo;
      }
      return true;
    });
  }, [transactions, period]);

  // Financial calculations
  const totalCashSales = filteredTx
    .filter(t => t.type === 'cash_sale')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCreditGiven = filteredTx
    .filter(t => t.type === 'credit_sale_given')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRevenue = totalCashSales + totalCreditGiven;

  const totalCollected = filteredTx
    .filter(t => t.type === 'credit_payment_collected' || t.type === 'partial_payment')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTx
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const costOfGoodsSold = filteredTx
    .filter(t => t.type === 'cash_sale' || t.type === 'credit_sale_given')
    .reduce((sum, t) => sum + (t.costAmount || 0), 0);

  const grossProfit = Math.max(0, totalRevenue - costOfGoodsSold);
  const netProfit = grossProfit - totalExpenses;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">আর্থিক ও লাভ-ক্ষতির রিপোর্ট</h3>
              <p className="text-[11px] text-slate-500">কেনা দামের ভিত্তিতে প্রকৃত মুনাফা হিসাব</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Period Selector Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          {[
            { id: 'today', label: 'আজকের' },
            { id: 'week', label: 'গত ৭ দিন' },
            { id: 'month', label: 'এই মাস' },
            { id: 'all', label: 'সর্বমোট' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id as any)}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                period === tab.id
                  ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50">
            <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 block">মোট বিক্রি (নগদ + বাকি):</span>
            <p className="text-xl font-bold text-teal-800 dark:text-teal-100 mt-0.5">{formatTaka(totalRevenue)}</p>
            <span className="text-[10px] text-teal-600 dark:text-teal-400">
              নগদ: {formatTaka(totalCashSales)} | বাকি: {formatTaka(totalCreditGiven)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block">প্রকৃত নিট লাভ:</span>
            <p className="text-xl font-bold text-emerald-800 dark:text-emerald-100 mt-0.5">{formatTaka(netProfit)}</p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
              মোট লাভ ({formatTaka(grossProfit)}) - খরচ ({formatTaka(totalExpenses)})
            </span>
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">হিসাবের বিস্তারিত সারসংক্ষেপ:</h4>
          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">১. মোট নগদ বিক্রি:</span>
            <span className="font-semibold">{formatTaka(totalCashSales)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">২. মোট বাকি বিক্রি (বাকি দিলাম):</span>
            <span className="font-semibold text-rose-600">{formatTaka(totalCreditGiven)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">৩. বাকি আদায় সংগ্রহ (বাকি পেলাম):</span>
            <span className="font-semibold text-emerald-600">{formatTaka(totalCollected)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">৪. বিক্রিত পণ্যের প্রকৃত কেনা খরচ:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">-{formatTaka(costOfGoodsSold)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">৫. দোকানের সাধারণ খরচ:</span>
            <span className="font-semibold text-amber-600">-{formatTaka(totalExpenses)}</span>
          </div>
          <div className="flex justify-between pt-2 text-sm font-bold">
            <span className="text-slate-900 dark:text-white">চূড়ান্ত নিট মুনাফা:</span>
            <span className={netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {formatTaka(netProfit)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex justify-between">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট রিপোর্ট</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
