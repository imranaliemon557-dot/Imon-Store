export type TransactionType =
  | 'cash_sale'                 // নগদ বিক্রি
  | 'credit_sale_given'          // বাকি দিলাম
  | 'credit_payment_collected'  // বাকি পেলাম
  | 'partial_payment'           // আংশিক পরিশোধ
  | 'return'                    // পণ্য ফেরত
  | 'expense'                   // দোকানের খরচ
  | 'correction';               // হিসাব সংশোধন

export interface StoreSettings {
  id: string;
  ownerId: string;
  storeName: string;
  phone: string;
  address: string;
  currency: string;             // ৳
  pinHash?: string;             // SHA-256 hashed 4-digit PIN
  pinSalt?: string;
  isPinLocked: boolean;
  theme: 'light' | 'dark' | 'system';
  createdAt: string;
  updatedAt: string;
}

export interface ProductItem {
  id: string;
  storeId: string;
  name: string;
  sku: string;
  costPrice: number;            // কেনা দাম (Taka)
  salePrice: number;            // বিক্রি দাম (Taka)
  stockQuantity: number;        // বর্তমান স্টক
  unit: string;                 // পিস, কেজি, লিটার, প্যাকেট, ইত্যাদি
  supplier: string;             // সরবরাহকারী
  lowStockThreshold: number;    // কম স্টক সতর্কতা সীমা
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  address?: string;
  currentBalance: number;       // ধনাদ্মক মানে কাস্টমারের কাছে বাকি পাওনা
  shareToken: string;           // সিকিউর স্টেটমেন্ট শেয়ারিং টোকেন
  shareTokenCreatedAt: string;
  privateNotes?: string;        // দোকানের নিজস্ব গোপন নোট (কাস্টমার দেখতে পাবে না)
  createdAt: string;
  updatedAt: string;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  unit: string;
  total: number;
}

export interface LedgerTransaction {
  id: string;
  storeId: string;
  type: TransactionType;
  customerId?: string;
  customerName?: string;
  amount: number;               // লেনদেনের মোট টাকা (Integer)
  costAmount: number;           // কেনা খরচের হিসাব (মুনাফা নির্ধারণের জন্য)
  previousBalance: number;
  newBalance: number;
  description: string;
  items?: TransactionItem[];
  idempotencyKey: string;       // ডুপ্লিকেট সাবমিশন রোধের ইউনিক কি
  timestamp: string;            // ISO timestamp in Asia/Dhaka
  createdAt: string;
  createdBy: string;
  isCorrected?: boolean;
  correctionReason?: string;
}

export interface StockMovement {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  changeQuantity: number;       // +5 (ক্রয়) or -2 (বিক্রি)
  previousQuantity: number;
  newQuantity: number;
  reason: string;               // 'বিক্রি', 'নতুন ক্রয়', 'নষ্ট/বাতিল', 'সংশোধন'
  linkedTransactionId?: string;
  timestamp: string;
}

export interface SupportMessage {
  id: string;
  storeId: string;
  customerId: string;
  customerName: string;
  senderType: 'customer' | 'owner';
  messageType: 'text' | 'voice';
  text?: string;
  voiceUrl?: string;            // Blob URL or Storage URL
  durationSeconds?: number;
  isRead: boolean;
  timestamp: string;
}

export interface ShopNote {
  id: string;
  storeId: string;
  targetType: 'shop' | 'product' | 'customer';
  targetId?: string;
  targetName?: string;
  title: string;
  content: string;
  isPrivate: boolean;           // কাস্টমার স্টেটমেন্টে কখনোই যাবে না
  reminderDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedVoiceCommand {
  rawTranscript: string;
  confidence: number;
  action: 'credit_sale_given' | 'credit_payment_collected' | 'cash_sale' | 'query_sales' | 'query_customer_due' | 'unknown';
  customerName?: string;
  amount?: number;
  description?: string;
  matchedCustomerId?: string;
  isValid: boolean;
}
