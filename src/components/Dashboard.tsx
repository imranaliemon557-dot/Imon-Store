import React from 'react';
import { Customer, LedgerTransaction, ProductItem, TransactionType } from '../types';
import { formatTaka, toBengaliNumber, formatDhakaDateTime, getBengaliTransactionTypeName } from '../utils/formatters';
import {
  TrendingUp,
  CreditCard,
  Banknote,
  Boxes,
  AlertTriangle,
  Receipt,
  PlusCircle,
  Mic,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Sparkles,
  BarChart3
} from 'lucide-react';

interface DashboardProps {
  transactions: LedgerTransaction[];
  products: ProductItem[];
  customers: Customer[];
  onOpenQuickTx: (type: TransactionType) => void;
  onOpenVoiceModal: () => void;
  onNavigateTab: (tab: 'ledger' | 'inventory' | 'customers' | 'notes') => void;
  onOpenReports: () => void;
  onSelectTransaction: (tx: LedgerTransaction) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  products,
  customers,
  onOpenQuickTx,
  onOpenVoiceModal,
  onNavigateTab,
  onOpenReports,
  onSelectTransaction,
}) => {
  // Today's date filter in local / Asia/Dhaka
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter(t => t.timestamp.startsWith(todayStr));

  // 1. Today's sales (নগদ বিক্রি + বাকি দিলাম)
  const todaySales = todayTransactions
    .filter(t => t.type === 'cash_sale' || t.type === 'credit_sale_given')
    .reduce((sum, t) => sum + t.amount, 0);

  // 2. Total customer dues (কাস্টমারদের কাছে মোট বাকি)
  const totalCustomerDues = customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);

  // 3. Today's collected payments (আজকের আদায়)
  const todayCollected = todayTransactions
    .filter(t => t.type === 'credit_payment_collected' || t.type === 'partial_payment')
    .reduce((sum, t) => sum + t.amount, 0);

  // 4. Total Stock items & value
  const activeProducts = products.filter(p => !p.isArchived);
  const totalStockCount = activeProducts.reduce((sum, p) => sum + p.stockQuantity, 0);
  const totalStockValue = activeProducts.reduce((sum, p) => sum + (p.stockQuantity * p.costPrice), 0);

  // 5. Low stock alerts
  const lowStockItems = activeProducts.filter(p => p.stockQuantity <= p.lowStockThreshold);

  // 6. Today's expenses
  const todayExpenses = todayTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // 7. Today's estimated gross profit
  const todayCost = todayTransactions
    .filter(t => t.type === 'cash_sale' || t.type === 'credit_sale_given')
    .reduce((sum, t) => sum + (t.costAmount || 0), 0);
  const estimatedGrossProfit = Math.max(0, todaySales - todayCost - todayExpenses);

  return (
    <div className="space-y-6 pb-20">
      {/* Voice Assistant Promo Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 text-white rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>বাংলা ভয়েস কমান্ড</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold">মুখে বললেই স্বয়ংক্রিয় হিসাব তৈরি!</h2>
          <p className="text-xs sm:text-sm text-teal-100 max-w-lg">
            যেমন বলুন: &ldquo;রহিমের নামে একশ টাকা বাকি লিখো&rdquo; বা &ldquo;করিম পঞ্চাশ টাকা দিয়েছে&rdquo;। সাথে সাথে যাচাই করে খাতা আপডেট হবে।
          </p>
        </div>
        <button
          onClick={onOpenVoiceModal}
          className="flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-5 py-3 rounded-xl shadow-md transition-all active:scale-95 shrink-0"
        >
          <Mic className="w-5 h-5 text-slate-900 animate-pulse" />
          <span>ভয়েস হিসাব শুরু করুন</span>
        </button>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onOpenQuickTx('cash_sale')}
          className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-teal-500 hover:shadow-md transition-all group active:scale-95"
        >
          <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Banknote className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">নগদ বিক্রি</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">ক্যাশ ইন</span>
        </button>

        <button
          onClick={() => onOpenQuickTx('credit_sale_given')}
          className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-rose-500 hover:shadow-md transition-all group active:scale-95"
        >
          <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-rose-700 dark:text-rose-400">বাকি দিলাম</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">পাওনা বৃদ্ধি</span>
        </button>

        <button
          onClick={() => onOpenQuickTx('credit_payment_collected')}
          className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group active:scale-95"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">বাকি পেলাম</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">টাকা জমা/আদায়</span>
        </button>

        <button
          onClick={() => onOpenQuickTx('expense')}
          className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-500 hover:shadow-md transition-all group active:scale-95"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Receipt className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-amber-700 dark:text-amber-400">দোকানের খরচ</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">বিল ও ব্যয়</span>
        </button>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Today's Sales */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">আজকের মোট বিক্রি</span>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {formatTaka(todaySales)}
            </p>
            <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">
              {toBengaliNumber(todayTransactions.filter(t => t.type === 'cash_sale' || t.type === 'credit_sale_given').length)} টি লেনদেন
            </span>
          </div>
        </div>

        {/* Total Customer Dues */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">কাস্টমারদের মোট বাকি (পাওনা)</span>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
              {formatTaka(totalCustomerDues)}
            </p>
            <button
              onClick={() => onNavigateTab('customers')}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
            >
              <span>তালিকায় যান</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Today's Collected Payments */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">আজকের আদায় (জমা)</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatTaka(todayCollected)}
            </p>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">নগদ সংগ্রহ</span>
          </div>
        </div>

        {/* Total Stock */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">মোট স্টকের মূল্য</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {formatTaka(totalStockValue)}
            </p>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              <span>{toBengaliNumber(activeProducts.length)} টি পণ্য</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Low Stock Items Alert Card */}
        <div className={`p-4 rounded-2xl border shadow-sm transition-all ${
          lowStockItems.length > 0
            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/50'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">কম স্টকের সতর্কতা</span>
            <div className={`p-2 rounded-lg ${lowStockItems.length > 0 ? 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 tracking-tight">
              {toBengaliNumber(lowStockItems.length)} টি পণ্য
            </p>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-xs text-amber-800 dark:text-amber-300 font-semibold hover:underline"
            >
              {lowStockItems.length > 0 ? 'দ্রুত স্টক আনুন' : 'সব ঠিক আছে'}
            </button>
          </div>
        </div>

        {/* Today's Expenses & Estimated Profit */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">আজকের খরচ ও প্রাক্কলিত লাভ</span>
            <button
              onClick={onOpenReports}
              title="বিস্তারিত হিসাব রিপোর্ট"
              className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">দোকান খরচ:</span>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatTaka(todayExpenses)}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">আনুমানিক লাভ:</span>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatTaka(estimatedGrossProfit)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">সাম্প্রতিক লেনদেন</h3>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
              সর্বশেষ {toBengaliNumber(Math.min(transactions.length, 8))} টি
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('ledger')}
            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
          >
            <span>সব দেখুন</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {transactions.slice(0, 8).map(tx => {
            const isCredit = tx.type === 'credit_sale_given';
            const isPayment = tx.type === 'credit_payment_collected' || tx.type === 'partial_payment';
            const isCash = tx.type === 'cash_sale';
            const isExpense = tx.type === 'expense';

            return (
              <div
                key={tx.id}
                onClick={() => onSelectTransaction(tx)}
                className="p-3.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isCredit ? 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400' :
                    isPayment ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
                    isCash ? 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400' :
                    isExpense ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' :
                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {isCredit ? <ArrowUpRight className="w-5 h-5" /> :
                     isPayment ? <ArrowDownLeft className="w-5 h-5" /> :
                     isCash ? <Banknote className="w-5 h-5" /> :
                     <Receipt className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {tx.customerName || (isExpense ? 'দোকান খরচ' : 'নগদ ক্রেতা')}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {getBengaliTransactionTypeName(tx.type)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-md">
                      {tx.description || (tx.items?.map(it => `${it.productName} (${toBengaliNumber(it.quantity)} ${it.unit})`).join(', ') || 'কোন বিবরণ নেই')}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-base font-bold ${
                    isCredit ? 'text-rose-600 dark:text-rose-400' :
                    isPayment ? 'text-emerald-600 dark:text-emerald-400' :
                    isCash ? 'text-teal-600 dark:text-teal-400' :
                    isExpense ? 'text-amber-600 dark:text-amber-400' :
                    'text-slate-900 dark:text-white'
                  }`}>
                    {isCredit ? '+' : isPayment ? '-' : ''}{formatTaka(tx.amount)}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {formatDhakaDateTime(tx.timestamp).split(',')[1]}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
