/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Customer, LedgerTransaction, ProductItem, ShopNote, StoreSettings, SupportMessage, TransactionType } from './types';
import { StorageService } from './services/storage';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { LedgerView } from './components/LedgerView';
import { InventoryView } from './components/InventoryView';
import { CustomerView } from './components/CustomerView';
import { SupportInboxView } from './components/SupportInboxView';
import { NotesRemindersView } from './components/NotesRemindersView';
import { CustomerStatementView } from './components/CustomerStatementView';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { PinLockModal } from './components/PinLockModal';
import { ReportsModal } from './components/ReportsModal';
import { SettingsModal } from './components/SettingsModal';
import {
  LayoutDashboard,
  Receipt,
  Boxes,
  Users,
  MessageSquare,
  StickyNote,
  Mic,
  Plus
} from 'lucide-react';

export default function App() {
  // Check for customer share token in URL query
  const [shareTokenFromUrl, setShareTokenFromUrl] = useState<string | null>(null);

  // App State
  const [settings, setSettings] = useState<StoreSettings>(() => {
    StorageService.init();
    return StorageService.getSettings();
  });
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [notes, setNotes] = useState<ShopNote[]>([]);

  // Active Bottom Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'inventory' | 'customers' | 'inbox' | 'notes'>('dashboard');

  // Modals
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isPinLocked, setIsPinLocked] = useState(false);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [quickTxType, setQuickTxType] = useState<TransactionType | undefined>(undefined);

  // Load and refresh all state from StorageService
  const refreshAllData = useCallback(() => {
    StorageService.init();
    const updatedSettings = StorageService.getSettings();
    setSettings(updatedSettings);
    setProducts(StorageService.getProducts());
    setCustomers(StorageService.getCustomers());
    setTransactions(StorageService.getTransactions());
    setMovements(StorageService.getStockMovements());
    setMessages(StorageService.getSupportMessages());
    setNotes(StorageService.getNotes());

    // Check if initial PIN lock is needed
    if (updatedSettings.pinHash && updatedSettings.isPinLocked) {
      setIsPinLocked(true);
    }
  }, []);

  useEffect(() => {
    // Check URL parameters
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('share');
      if (token) {
        setShareTokenFromUrl(token);
        return;
      }
    }
    refreshAllData();
  }, [refreshAllData]);

  // If visiting directly via share token link (e.g. customer clicking their WhatsApp statement link)
  if (shareTokenFromUrl) {
    return <CustomerStatementView shareToken={shareTokenFromUrl} />;
  }

  const unreadMessagesCount = messages.filter(m => !m.isRead && m.senderType === 'customer').length;
  const lowStockCount = products.filter(p => !p.isArchived && p.stockQuantity <= p.lowStockThreshold).length;

  const handleOpenQuickTx = (type: TransactionType) => {
    setQuickTxType(type);
    setActiveTab('ledger');
  };

  const handleOpenCustomerTx = (customerId: string, type: 'credit_sale_given' | 'credit_payment_collected') => {
    setQuickTxType(type);
    setActiveTab('ledger');
  };

  const handleVoiceTransaction = (params: {
    type: 'credit_sale_given' | 'credit_payment_collected' | 'cash_sale';
    customerId?: string;
    customerName?: string;
    amount: number;
    description: string;
  }) => {
    StorageService.executeTransaction(params);
    refreshAllData();
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-['Hind_Siliguri',sans-serif] flex flex-col">
      {/* Top Header */}
      <Header
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLockPin={() => setIsPinLocked(true)}
        lowStockCount={lowStockCount}
        unreadMessagesCount={unreadMessagesCount}
        onOpenInbox={() => setActiveTab('inbox')}
        onOpenInventory={() => setActiveTab('inventory')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        {activeTab === 'dashboard' && (
          <Dashboard
            transactions={transactions}
            products={products}
            customers={customers}
            onOpenQuickTx={handleOpenQuickTx}
            onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
            onNavigateTab={tab => setActiveTab(tab)}
            onOpenReports={() => setIsReportsOpen(true)}
            onSelectTransaction={() => setActiveTab('ledger')}
          />
        )}

        {activeTab === 'ledger' && (
          <LedgerView
            key={quickTxType || 'ledger_default'}
            transactions={transactions}
            products={products}
            customers={customers}
            onRefresh={refreshAllData}
            initialType={quickTxType}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            products={products}
            movements={movements}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerView
            customers={customers}
            transactions={transactions}
            onRefresh={refreshAllData}
            onOpenQuickTxForCustomer={handleOpenCustomerTx}
            onPreviewStatement={token => setPreviewToken(token)}
          />
        )}

        {activeTab === 'inbox' && (
          <SupportInboxView
            messages={messages}
            onRefresh={refreshAllData}
          />
        )}

        {activeTab === 'notes' && (
          <NotesRemindersView
            notes={notes}
            onRefresh={refreshAllData}
          />
        )}
      </main>

      {/* Android Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-lg px-2 py-1.5 flex items-center justify-around">
        <button
          onClick={() => { setQuickTxType(undefined); setActiveTab('dashboard'); }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'dashboard' ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">ড্যাশবোর্ড</span>
        </button>

        <button
          onClick={() => { setQuickTxType(undefined); setActiveTab('ledger'); }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'ledger' ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">খাতা</span>
        </button>

        {/* Center Floating Voice Action Button */}
        <button
          onClick={() => setIsVoiceModalOpen(true)}
          className="w-12 h-12 -mt-5 rounded-full bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 active:scale-90 transition-transform"
          title="বাংলা ভয়েস হিসাব"
        >
          <Mic className="w-6 h-6" />
        </button>

        <button
          onClick={() => { setQuickTxType(undefined); setActiveTab('inventory'); }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all relative ${
            activeTab === 'inventory' ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Boxes className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">স্টক</span>
          {lowStockCount > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => { setQuickTxType(undefined); setActiveTab('customers'); }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'customers' ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">কাস্টমার</span>
        </button>

        <button
          onClick={() => { setQuickTxType(undefined); setActiveTab('inbox'); }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all relative ${
            activeTab === 'inbox' ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">ইনবক্স</span>
          {unreadMessagesCount > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-rose-500" />
          )}
        </button>
      </nav>

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        customers={customers}
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onExecuteTransaction={handleVoiceTransaction}
      />

      {/* PIN Lock Modal */}
      <PinLockModal
        settings={settings}
        isOpen={isPinLocked}
        onSuccess={() => setIsPinLocked(false)}
        onRefreshSettings={refreshAllData}
      />

      {/* Financial Reports Modal */}
      <ReportsModal
        transactions={transactions}
        products={products}
        customers={customers}
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
      />

      {/* Settings & APK Modal */}
      <SettingsModal
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onRefresh={refreshAllData}
      />

      {/* Shopkeeper Customer Statement Preview Modal */}
      {previewToken && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm">
          <CustomerStatementView
            shareToken={previewToken}
            isShopOwnerPreview={true}
            onClose={() => setPreviewToken(null)}
          />
        </div>
      )}
    </div>
  );
}
