import React, { useState, useMemo } from 'react';
import { Customer, LedgerTransaction, ProductItem, TransactionType } from '../types';
import { StorageService } from '../services/storage';
import { formatTaka, toBengaliNumber, formatDhakaDateTime, getBengaliTransactionTypeName } from '../utils/formatters';
import { generateIdempotencyKey } from '../utils/security';
import confetti from 'canvas-confetti';
import {
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
  Receipt,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  X,
  FileText
} from 'lucide-react';

interface LedgerViewProps {
  transactions: LedgerTransaction[];
  products: ProductItem[];
  customers: Customer[];
  onRefresh: () => void;
  initialType?: TransactionType;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  transactions,
  products,
  customers,
  onRefresh,
  initialType,
}) => {
  const [selectedTab, setSelectedTab] = useState<string>(initialType || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(!!initialType);
  const [selectedTx, setSelectedTx] = useState<LedgerTransaction | null>(null);

  // New Transaction Form State
  const [txType, setTxType] = useState<TransactionType>(initialType || 'credit_sale_given');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [customCustomerPhone, setCustomCustomerPhone] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [allowStockOverride, setAllowStockOverride] = useState(false);
  const [selectedCartItems, setSelectedCartItems] = useState<Array<{ productId: string; quantity: number; unitPrice: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Tab filter
      if (selectedTab !== 'all' && tx.type !== selectedTab) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const custName = (tx.customerName || '').toLowerCase();
        const desc = (tx.description || '').toLowerCase();
        const id = tx.id.toLowerCase();
        return custName.includes(q) || desc.includes(q) || id.includes(q);
      }
      return true;
    });
  }, [transactions, selectedTab, searchQuery]);

  // Product selection handler for cart
  const handleAddProductToCart = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setSelectedCartItems(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing) {
        return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: prod.id, quantity: 1, unitPrice: prod.salePrice }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setSelectedCartItems(prev => prev.filter(i => i.productId !== productId));
    } else {
      setSelectedCartItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
    }
  };

  // Calculate cart total
  const cartTotal = useMemo(() => {
    return selectedCartItems.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
  }, [selectedCartItems]);

  // Sync amount with cart total if items are added
  React.useEffect(() => {
    if (selectedCartItems.length > 0) {
      setAmount(cartTotal);
    }
  }, [cartTotal, selectedCartItems.length]);

  // Handle Form Submission with duplicate guard & atomicity
  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const finalAmount = typeof amount === 'number' ? amount : cartTotal;
    if (finalAmount <= 0) {
      setFormError('দয়া করে সঠিক টাকার পরিমাণ লিখুন।');
      return;
    }

    if ((txType === 'credit_sale_given' || txType === 'credit_payment_collected' || txType === 'partial_payment') && !selectedCustomerId && !customCustomerName.trim()) {
      setFormError('বাকির হিসাব রাখার জন্য কাস্টমারের নাম নির্বাচন করা আবশ্যক।');
      return;
    }

    setIsSubmitting(true);

    try {
      let customerId = selectedCustomerId;
      let customerName = '';

      if (customerId) {
        const c = customers.find(item => item.id === customerId);
        customerName = c?.name || '';
      } else if (customCustomerName.trim()) {
        // Create new customer on the fly
        const newCust = StorageService.saveCustomer({
          storeId: 'store_imon_main',
          name: customCustomerName.trim(),
          phone: customCustomerPhone.trim() || '01XXXXXXXXX',
          currentBalance: 0,
        });
        customerId = newCust.id;
        customerName = newCust.name;
      }

      const idempotencyKey = generateIdempotencyKey();

      const result = StorageService.executeTransaction({
        type: txType,
        customerId: customerId || undefined,
        customerName: customerName || undefined,
        amount: finalAmount,
        description: description.trim() || (txType === 'credit_sale_given' ? 'বাকিতে পণ্য বিক্রয়' : txType === 'credit_payment_collected' ? 'বাকি আদায় (জমা)' : 'দোকান লেনদেন'),
        items: selectedCartItems.length > 0 ? selectedCartItems : undefined,
        allowStockOverride,
        idempotencyKey,
      });

      if (!result.success) {
        setFormError(result.error || 'লেনদেন সম্পন্ন করা সম্ভব হয়নি।');
        setIsSubmitting(false);
        return;
      }

      // Success celebration!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });

      // Reset form
      setIsAddModalOpen(false);
      setAmount('');
      setDescription('');
      setSelectedCartItems([]);
      setSelectedCustomerId('');
      setCustomCustomerName('');
      setCustomCustomerPhone('');
      onRefresh();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'ত্রুটি ঘটেছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV Export for Ledger
  const handleExportCSV = () => {
    const headers = ['লেনদেন আইডি', 'তারিখ ও সময়', 'ধরন', 'কাস্টমার', 'বিবরণ', 'টাকার পরিমাণ (৳)'];
    const rows = filteredTransactions.map(tx => [
      tx.id,
      formatDhakaDateTime(tx.timestamp),
      getBengaliTransactionTypeName(tx.type),
      tx.customerName || 'নগদ ক্রেতা',
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      tx.amount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `imon_store_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>দোকান খাতা ও লেনদেন বিবরণী</span>
            <span className="text-xs bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-2.5 py-0.5 rounded-full font-semibold">
              {toBengaliNumber(filteredTransactions.length)} টি
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            বাকি, নগদ বিক্রি, আদায় ও দোকান খরচের সম্পূর্ণ খতিয়ান
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>CSV এক্সপোর্ট</span>
          </button>

          <button
            onClick={() => {
              setTxType('credit_sale_given');
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন লেনদেন</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Scrollable Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'সব লেনদেন' },
            { id: 'credit_sale_given', label: 'বাকি দিলাম' },
            { id: 'credit_payment_collected', label: 'বাকি পেলাম' },
            { id: 'cash_sale', label: 'নগদ বিক্রি' },
            { id: 'expense', label: 'দোকান খরচ' },
            { id: 'return', label: 'ফেরত' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedTab === tab.id
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="কাস্টমার বা বিবরণ খুঁজুন..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Transaction List Cards */}
      <div className="space-y-2.5">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">কোন লেনদেন পাওয়া যায়নি</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              নতুন খাতা এন্ট্রি করতে &ldquo;নতুন লেনদেন&rdquo; বোতামে ক্লিক করুন।
            </p>
          </div>
        ) : (
          filteredTransactions.map(tx => {
            const isCredit = tx.type === 'credit_sale_given';
            const isPayment = tx.type === 'credit_payment_collected' || tx.type === 'partial_payment';
            const isCash = tx.type === 'cash_sale';
            const isExpense = tx.type === 'expense';

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-teal-500/50 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isCredit ? 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400' :
                    isPayment ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
                    isCash ? 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400' :
                    isExpense ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' :
                    'bg-slate-100 text-slate-600 dark:bg-slate-800'
                  }`}>
                    {isCredit ? <ArrowUpRight className="w-5 h-5" /> :
                     isPayment ? <ArrowDownLeft className="w-5 h-5" /> :
                     isCash ? <Banknote className="w-5 h-5" /> :
                     <Receipt className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {tx.customerName || (isExpense ? 'দোকানের খরচ' : 'নগদ ক্রেতা')}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {getBengaliTransactionTypeName(tx.type)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {tx.description || (tx.items?.map(i => `${i.productName} (${toBengaliNumber(i.quantity)})`).join(', '))}
                    </p>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      {formatDhakaDateTime(tx.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className={`text-base sm:text-lg font-bold tracking-tight ${
                    isCredit ? 'text-rose-600 dark:text-rose-400' :
                    isPayment ? 'text-emerald-600 dark:text-emerald-400' :
                    isCash ? 'text-teal-600 dark:text-teal-400' :
                    isExpense ? 'text-amber-600 dark:text-amber-400' :
                    'text-slate-900 dark:text-white'
                  }`}>
                    {isCredit ? '+' : isPayment ? '-' : ''}{formatTaka(tx.amount)}
                  </p>
                  {tx.customerId && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      অবশিষ্ট বাকি: {formatTaka(tx.newBalance)}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 dark:text-white">রসিদ ও লেনদেন বিবরণ</h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">লেনদেন আইডি:</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{selectedTx.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">তারিখ ও সময়:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{formatDhakaDateTime(selectedTx.timestamp)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">লেনদেনের ধরন:</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">{getBengaliTransactionTypeName(selectedTx.type)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">কাস্টমার / পক্ষ:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedTx.customerName || 'নগদ সওদা'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">মোট টাকা:</span>
                <span className="font-bold text-base text-teal-600 dark:text-teal-400">{formatTaka(selectedTx.amount)}</span>
              </div>
              {selectedTx.customerId && (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">আগের বাকি:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{formatTaka(selectedTx.previousBalance)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">বর্তমান বাকি:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{formatTaka(selectedTx.newBalance)}</span>
                  </div>
                </>
              )}

              {/* Items Table if any */}
              {selectedTx.items && selectedTx.items.length > 0 && (
                <div className="mt-3">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1.5">পণ্যসমূহ:</h4>
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 space-y-1">
                    {selectedTx.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{it.productName} ({toBengaliNumber(it.quantity)} {it.unit})</span>
                        <span className="font-semibold">{formatTaka(it.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                <span className="text-slate-400 block text-[10px]">বিবরণ / নোট:</span>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5">{selectedTx.description || 'কোন অতিরিক্ত বিবরণ নেই'}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold"
              >
                <Printer className="w-4 h-4" />
                <span>প্রিন্ট রসিদ</span>
              </button>
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Transaction Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-600" />
                <span>নতুন হিসাব এন্ট্রি করুন</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  লেনদেনের ধরন নির্বাচন করুন:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { type: 'credit_sale_given', label: 'বাকি দিলাম', color: 'border-rose-500 text-rose-600 bg-rose-50/50 dark:bg-rose-950/30' },
                    { type: 'credit_payment_collected', label: 'বাকি পেলাম (আদায়)', color: 'border-emerald-500 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30' },
                    { type: 'cash_sale', label: 'নগদ বিক্রি', color: 'border-teal-500 text-teal-600 bg-teal-50/50 dark:bg-teal-950/30' },
                    { type: 'expense', label: 'দোকান খরচ', color: 'border-amber-500 text-amber-600 bg-amber-50/50 dark:bg-amber-950/30' },
                    { type: 'return', label: 'পণ্য ফেরত', color: 'border-purple-500 text-purple-600 bg-purple-50/50 dark:bg-purple-950/30' },
                  ].map(item => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setTxType(item.type as TransactionType)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        txType === item.type
                          ? `${item.color} ring-2 ring-teal-500 shadow-sm`
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer selection for credit sales & payments */}
              {(txType === 'credit_sale_given' || txType === 'credit_payment_collected' || txType === 'partial_payment') && (
                <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    কাস্টমার নির্বাচন করুন:
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={e => {
                      setSelectedCustomerId(e.target.value);
                      if (e.target.value) {
                        setCustomCustomerName('');
                      }
                    }}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- বর্তমান কাস্টমার থেকে বেছে নিন --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) - বর্তমান বাকি: {formatTaka(c.currentBalance)}
                      </option>
                    ))}
                  </select>

                  {!selectedCustomerId && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-[11px] text-slate-500 block mb-1">অথবা নতুন কাস্টমারের নাম:</span>
                        <input
                          type="text"
                          placeholder="নাম লিখুন..."
                          value={customCustomerName}
                          onChange={e => setCustomCustomerName(e.target.value)}
                          className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block mb-1">মোবাইল নম্বর:</span>
                        <input
                          type="tel"
                          placeholder="01XXXXXXXXX"
                          value={customCustomerPhone}
                          onChange={e => setCustomCustomerPhone(e.target.value)}
                          className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Product Cart Picker (For Cash Sale & Credit Sale) */}
              {(txType === 'cash_sale' || txType === 'credit_sale_given') && (
                <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">স্টক থেকে পণ্য যোগ করুন:</span>
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                      মোট: {formatTaka(cartTotal)}
                    </span>
                  </div>

                  {/* Quick Product Buttons */}
                  <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none">
                    {products.filter(p => !p.isArchived).slice(0, 6).map(prod => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleAddProductToCart(prod.id)}
                        className="px-2.5 py-1.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-teal-500 whitespace-nowrap shadow-xs text-slate-700 dark:text-slate-300 shrink-0"
                      >
                        + {prod.name} ({formatTaka(prod.salePrice)})
                      </button>
                    ))}
                  </div>

                  {/* Selected Cart Items */}
                  {selectedCartItems.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                      {selectedCartItems.map(item => {
                        const prod = products.find(p => p.id === item.productId);
                        return (
                          <div key={item.productId} className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                              {prod?.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQuantity(item.productId, item.quantity - 1)}
                                className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300"
                              >
                                -
                              </button>
                              <span className="font-bold">{toBengaliNumber(item.quantity)}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQuantity(item.productId, item.quantity + 1)}
                                className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300"
                              >
                                +
                              </button>
                              <span className="w-16 text-right font-bold text-teal-600">
                                {formatTaka(item.quantity * item.unitPrice)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Amount Input (Minor units integer safety) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  টাকার পরিমাণ (৳):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">৳</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="যেমন: ৫০০"
                    value={amount}
                    onChange={e => setAmount(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    className="w-full pl-8 pr-3 py-2.5 text-base font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  বিবরণ / নোট (ঐচ্ছিক):
                </label>
                <input
                  type="text"
                  placeholder="যেমন: সয়াবিন তেল ও চিনি"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold bg-teal-600 hover:bg-teal-500 disabled:bg-teal-400 text-white rounded-xl shadow-md transition-all active:scale-95"
                >
                  {isSubmitting ? (
                    <span>সংরক্ষণ হচ্ছে...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>খাতায় যুক্ত করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
