import type {
  Customer,
  LedgerTransaction,
  ProductItem,
  ShopNote,
  StockMovement,
  StoreSettings,
  SupportMessage,
  TransactionType,
} from '../types';
import { generateIdempotencyKey, generateShareToken, hashPin } from '../utils/security';

const STORAGE_KEYS = {
  SETTINGS: 'imon_store_settings_v1',
  PRODUCTS: 'imon_store_products_v1',
  CUSTOMERS: 'imon_store_customers_v1',
  TRANSACTIONS: 'imon_store_transactions_v1',
  MOVEMENTS: 'imon_store_movements_v1',
  MESSAGES: 'imon_store_messages_v1',
  NOTES: 'imon_store_notes_v1',
  LAST_SYNC: 'imon_store_last_sync_v1',
};

// Realistic Bengali Seed Data for initial boot
const DEFAULT_STORE_SETTINGS: StoreSettings = {
  id: 'store_imon_main',
  ownerId: 'owner_default',
  storeName: 'ইমন স্টোর',
  phone: '01711-234567',
  address: 'নিউ মার্কেট রোড, ঢাকা-১২০৫',
  currency: '৳',
  isPinLocked: false,
  theme: 'system',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const SEED_PRODUCTS: ProductItem[] = [
  {
    id: 'prod_1',
    storeId: 'store_imon_main',
    name: 'তীর সয়াবিন তেল ১ লিটার',
    sku: '8941100201',
    costPrice: 175,
    salePrice: 190,
    stockQuantity: 45,
    unit: 'বোতল',
    supplier: 'সিটি গ্রুপ',
    lowStockThreshold: 10,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_2',
    storeId: 'store_imon_main',
    name: 'মিনিকেট চাল প্রিমিয়াম (১ কেজি)',
    sku: '8941100202',
    costPrice: 72,
    salePrice: 80,
    stockQuantity: 250,
    unit: 'কেজি',
    supplier: 'কুষ্টিয়া রাইস',
    lowStockThreshold: 50,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_3',
    storeId: 'store_imon_main',
    name: 'দেশি মসুর ডাল (১ কেজি)',
    sku: '8941100203',
    costPrice: 135,
    salePrice: 150,
    stockQuantity: 8, // Low stock for alert test!
    unit: 'কেজি',
    supplier: 'খাতুনগঞ্জ ট্রেডার্স',
    lowStockThreshold: 15,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_4',
    storeId: 'store_imon_main',
    name: 'ফ্রেশ চিনি (১ কেজি)',
    sku: '8941100204',
    costPrice: 130,
    salePrice: 145,
    stockQuantity: 60,
    unit: 'কেজি',
    supplier: 'মেঘনা গ্রুপ',
    lowStockThreshold: 20,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_5',
    storeId: 'store_imon_main',
    name: 'ডানো গুঁড়ো দুধ ৫০০ গ্রাম',
    sku: '8941100205',
    costPrice: 440,
    salePrice: 480,
    stockQuantity: 18,
    unit: 'প্যাকেট',
    supplier: 'আর্লা ফুডস',
    lowStockThreshold: 5,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_6',
    storeId: 'store_imon_main',
    name: 'আইসপি সাবান ১০০ গ্রাম',
    sku: '8941100206',
    costPrice: 50,
    salePrice: 60,
    stockQuantity: 4, // Low stock!
    unit: 'পিস',
    supplier: 'স্কয়ার টয়লেট্রিজ',
    lowStockThreshold: 10,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust_1',
    storeId: 'store_imon_main',
    name: 'রহিম ভাই (দোকানদার)',
    phone: '01812-345678',
    address: 'বাড়ি #১২, রোড #৩, ধানমন্ডি',
    currentBalance: 3450, // ৩,৪৫০ টাকা বাকি
    shareToken: 'token_rahim_7f8a9b2c3d4e5f6',
    shareTokenCreatedAt: new Date().toISOString(),
    privateNotes: 'প্রতি মাসের ৫ তারিখে বেতন পাওয়ার পর বাকি পরিশোধ করেন। বিশ্বস্ত কাস্টমার।',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust_2',
    storeId: 'store_imon_main',
    name: 'করিম চাচা',
    phone: '01911-987654',
    address: 'মাদ্রাসার দক্ষিণ পাশে',
    currentBalance: 1200, // ১,২০০ টাকা বাকি
    shareToken: 'token_karim_9a8b7c6d5e4f3',
    shareTokenCreatedAt: new Date().toISOString(),
    privateNotes: 'প্রতি শুক্রবার জুমার পর হিসাব মিটিয়ে নেন।',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust_3',
    storeId: 'store_imon_main',
    name: 'রফিকুল সাহেব',
    phone: '01722-456789',
    address: 'গ্রীনভিউ অ্যাপার্টমেন্ট, ফ্ল্যাট ৪বি',
    currentBalance: 0, // কোন বাকি নেই
    shareToken: 'token_rafiq_3c4d5e6f7a8b9',
    shareTokenCreatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const memoryStore: Record<string, string> = {};

export class StorageService {
  private static get<T>(key: string, defaultValue: T): T {
    try {
      let data: string | null = null;
      if (typeof localStorage !== 'undefined') {
        data = localStorage.getItem(key);
      } else {
        data = memoryStore[key] || null;
      }
      if (!data) return defaultValue;
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
  }

  private static set<T>(key: string, value: T): void {
    try {
      const str = JSON.stringify(value);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, str);
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      }
      memoryStore[key] = str;
      memoryStore[STORAGE_KEYS.LAST_SYNC] = new Date().toISOString();
    } catch (e) {
      console.error('Storage write error', e);
    }
  }

  public static clear(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    for (const k in memoryStore) {
      delete memoryStore[k];
    }
  }

  private static getStorageItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return memoryStore[key] || null;
  }

  // --- Initialize Storage ---
  public static init(): void {
    if (!this.getStorageItem(STORAGE_KEYS.SETTINGS)) {
      this.set(STORAGE_KEYS.SETTINGS, DEFAULT_STORE_SETTINGS);
    }
    if (!this.getStorageItem(STORAGE_KEYS.PRODUCTS)) {
      this.set(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    }
    if (!this.getStorageItem(STORAGE_KEYS.CUSTOMERS)) {
      this.set(STORAGE_KEYS.CUSTOMERS, SEED_CUSTOMERS);
    }
    if (!this.getStorageItem(STORAGE_KEYS.TRANSACTIONS)) {
      // Seed initial transactions
      const seedTx: LedgerTransaction[] = [
        {
          id: 'tx_seed_1',
          storeId: 'store_imon_main',
          type: 'cash_sale',
          amount: 2450,
          costAmount: 2100,
          previousBalance: 0,
          newBalance: 0,
          description: 'সকালের নগদ সওদা বিক্রি',
          idempotencyKey: 'seed_tx_key_1',
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          createdBy: 'owner',
        },
        {
          id: 'tx_seed_2',
          storeId: 'store_imon_main',
          type: 'credit_sale_given',
          customerId: 'cust_1',
          customerName: 'রহিম ভাই (দোকানদার)',
          amount: 1500,
          costAmount: 1320,
          previousBalance: 1950,
          newBalance: 3450,
          description: 'চাল ও মসুর ডাল বাকিতে নিলেন',
          idempotencyKey: 'seed_tx_key_2',
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          createdBy: 'owner',
        },
        {
          id: 'tx_seed_3',
          storeId: 'store_imon_main',
          type: 'credit_payment_collected',
          customerId: 'cust_2',
          customerName: 'করিম চাচা',
          amount: 800,
          costAmount: 0,
          previousBalance: 2000,
          newBalance: 1200,
          description: 'আগের বাকির ৮০০ টাকা নগদ জমা দিলেন',
          idempotencyKey: 'seed_tx_key_3',
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          createdBy: 'owner',
        },
        {
          id: 'tx_seed_4',
          storeId: 'store_imon_main',
          type: 'expense',
          amount: 350,
          costAmount: 350,
          previousBalance: 0,
          newBalance: 0,
          description: 'দোকানের বিদ্যুৎ বিল ও চা নাস্তা',
          idempotencyKey: 'seed_tx_key_4',
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          createdBy: 'owner',
        },
      ];
      this.set(STORAGE_KEYS.TRANSACTIONS, seedTx);
    }
    if (!this.getStorageItem(STORAGE_KEYS.MOVEMENTS)) {
      this.set(STORAGE_KEYS.MOVEMENTS, []);
    }
    if (!this.getStorageItem(STORAGE_KEYS.MESSAGES)) {
      this.set(STORAGE_KEYS.MESSAGES, [
        {
          id: 'msg_seed_1',
          storeId: 'store_imon_main',
          customerId: 'cust_1',
          customerName: 'রহিম ভাই (দোকানদার)',
          senderType: 'customer',
          messageType: 'text',
          text: 'ইমন ভাই, আমার বাকি হিসাবটা একটু যাচাই করে দেখতে চাচ্ছিলাম।',
          isRead: false,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
    if (!this.getStorageItem(STORAGE_KEYS.NOTES)) {
      this.set(STORAGE_KEYS.NOTES, [
        {
          id: 'note_seed_1',
          storeId: 'store_imon_main',
          targetType: 'shop',
          title: 'শুক্রবার পাইকারি বাজার থেকে মাল আনা',
          content: 'মৌলভীবাজার থেকে মসুর ডাল ও তেল স্টক শেষ হওয়ার আগে কিনে আনতে হবে।',
          isPrivate: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    }
  }

  // --- Settings ---
  public static getSettings(): StoreSettings {
    return this.get<StoreSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_STORE_SETTINGS);
  }

  public static updateSettings(settings: Partial<StoreSettings>): StoreSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };
    this.set(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  }

  // --- Products ---
  public static getProducts(): ProductItem[] {
    return this.get<ProductItem[]>(STORAGE_KEYS.PRODUCTS, []);
  }

  public static getProduct(id: string): ProductItem | undefined {
    return this.getProducts().find(p => p.id === id);
  }

  public static saveProduct(product: Omit<ProductItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): ProductItem {
    const products = this.getProducts();
    const now = new Date().toISOString();
    let saved: ProductItem;

    if (product.id) {
      const idx = products.findIndex(p => p.id === product.id);
      if (idx >= 0) {
        saved = {
          ...products[idx],
          ...product,
          id: product.id,
          updatedAt: now,
        };
        products[idx] = saved;
      } else {
        saved = {
          ...product,
          id: product.id,
          createdAt: now,
          updatedAt: now,
        };
        products.push(saved);
      }
    } else {
      saved = {
        ...product,
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      products.push(saved);
    }

    this.set(STORAGE_KEYS.PRODUCTS, products);
    return saved;
  }

  public static deleteProduct(id: string): void {
    const products = this.getProducts().filter(p => p.id !== id);
    this.set(STORAGE_KEYS.PRODUCTS, products);
  }

  public static archiveProduct(id: string, isArchived = true): void {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx >= 0) {
      products[idx].isArchived = isArchived;
      products[idx].updatedAt = new Date().toISOString();
      this.set(STORAGE_KEYS.PRODUCTS, products);
    }
  }

  // --- Customers ---
  public static getCustomers(): Customer[] {
    return this.get<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
  }

  public static getCustomer(id: string): Customer | undefined {
    return this.getCustomers().find(c => c.id === id);
  }

  public static getCustomerByShareToken(token: string): Customer | undefined {
    return this.getCustomers().find(c => c.shareToken === token);
  }

  public static saveCustomer(customer: Omit<Customer, 'id' | 'shareToken' | 'shareTokenCreatedAt' | 'createdAt' | 'updatedAt'> & { id?: string }): Customer {
    const customers = this.getCustomers();
    const now = new Date().toISOString();
    let saved: Customer;

    if (customer.id) {
      const idx = customers.findIndex(c => c.id === customer.id);
      if (idx >= 0) {
        saved = {
          ...customers[idx],
          ...customer,
          id: customer.id,
          updatedAt: now,
        };
        customers[idx] = saved;
      } else {
        saved = {
          ...customer,
          id: customer.id,
          shareToken: generateShareToken(),
          shareTokenCreatedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        customers.push(saved);
      }
    } else {
      saved = {
        ...customer,
        id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        shareToken: generateShareToken(),
        shareTokenCreatedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      customers.push(saved);
    }

    this.set(STORAGE_KEYS.CUSTOMERS, customers);
    return saved;
  }

  public static regenerateCustomerShareToken(customerId: string): string {
    const customers = this.getCustomers();
    const idx = customers.findIndex(c => c.id === customerId);
    if (idx >= 0) {
      const newToken = generateShareToken();
      customers[idx].shareToken = newToken;
      customers[idx].shareTokenCreatedAt = new Date().toISOString();
      customers[idx].updatedAt = new Date().toISOString();
      this.set(STORAGE_KEYS.CUSTOMERS, customers);
      return newToken;
    }
    throw new Error('Customer not found');
  }

  // --- Transactions & Atomic Stock/Ledger Updates ---
  public static getTransactions(): LedgerTransaction[] {
    return this.get<LedgerTransaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
  }

  public static getStockMovements(): StockMovement[] {
    return this.get<StockMovement[]>(STORAGE_KEYS.MOVEMENTS, []);
  }

  /**
   * ATOMIC EXECUTE TRANSACTION:
   * 1. Checks idempotency key to prevent duplicate submissions.
   * 2. Validates stock availability (rejects sales exceeding stock unless override).
   * 3. Deducts stock & creates stock movements audit trail.
   * 4. Updates customer balance (বাকি দিলে বাড়ে, বাকি পেলে কমে).
   * 5. Saves ledger record with immutable audit metadata.
   */
  public static executeTransaction(params: {
    type: TransactionType;
    customerId?: string;
    customerName?: string;
    amount: number;
    costAmount?: number;
    description: string;
    items?: Array<{ productId: string; quantity: number; unitPrice: number }>;
    allowStockOverride?: boolean;
    idempotencyKey?: string;
    timestamp?: string;
  }): { success: boolean; transaction?: LedgerTransaction; error?: string } {
    const txIdempotencyKey = params.idempotencyKey || generateIdempotencyKey();
    const existingTransactions = this.getTransactions();

    // Check duplicate submission
    const existing = existingTransactions.find(t => t.idempotencyKey === txIdempotencyKey);
    if (existing) {
      return { success: true, transaction: existing };
    }

    // Amount must be positive integer
    const finalAmount = Math.max(0, Math.round(params.amount));
    const now = params.timestamp || new Date().toISOString();
    const products = this.getProducts();
    const customers = this.getCustomers();
    const movements = this.getStockMovements();

    // Stock check
    let computedCost = params.costAmount || 0;
    const stockDeductionPlan: Array<{
      product: ProductItem;
      qty: number;
      prevQty: number;
      newQty: number;
    }> = [];

    if (params.items && params.items.length > 0) {
      for (const item of params.items) {
        const prod = products.find(p => p.id === item.productId);
        if (!prod) {
          return { success: false, error: `পণ্য পাওয়া যায়নি (ID: ${item.productId})` };
        }

        // Check if sales reduce stock
        if (params.type === 'cash_sale' || params.type === 'credit_sale_given') {
          if (prod.stockQuantity < item.quantity && !params.allowStockOverride) {
            return {
              success: false,
              error: `"${prod.name}"-এর পর্যাপ্ত স্টক নেই! বর্তমান স্টক: ${prod.stockQuantity} ${prod.unit}, চাওয়া হয়েছে: ${item.quantity} ${prod.unit}`,
            };
          }
          stockDeductionPlan.push({
            product: prod,
            qty: -item.quantity,
            prevQty: prod.stockQuantity,
            newQty: prod.stockQuantity - item.quantity,
          });
          computedCost += Math.round(prod.costPrice * item.quantity);
        } else if (params.type === 'return') {
          // Returns increase stock
          stockDeductionPlan.push({
            product: prod,
            qty: item.quantity,
            prevQty: prod.stockQuantity,
            newQty: prod.stockQuantity + item.quantity,
          });
        }
      }
    }

    // Customer balance update calculation
    let prevBalance = 0;
    let newBalance = 0;
    let targetCustomer: Customer | undefined;

    if (params.customerId) {
      targetCustomer = customers.find(c => c.id === params.customerId);
      if (targetCustomer) {
        prevBalance = targetCustomer.currentBalance;
        if (params.type === 'credit_sale_given') {
          // বাকি দিলে কাস্টমারের পাওনা বাড়ে
          newBalance = prevBalance + finalAmount;
        } else if (params.type === 'credit_payment_collected' || params.type === 'partial_payment') {
          // বাকি পেলে (আদায়) কাস্টমারের পাওনা কমে
          newBalance = Math.max(0, prevBalance - finalAmount);
        } else if (params.type === 'return') {
          newBalance = Math.max(0, prevBalance - finalAmount);
        } else {
          newBalance = prevBalance;
        }
        targetCustomer.currentBalance = newBalance;
        targetCustomer.updatedAt = now;
      }
    }

    // Generate transaction ID
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Apply stock deduction plan & create stock movements
    for (const plan of stockDeductionPlan) {
      plan.product.stockQuantity = plan.newQty;
      plan.product.updatedAt = now;

      movements.push({
        id: `mvt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        storeId: 'store_imon_main',
        productId: plan.product.id,
        productName: plan.product.name,
        changeQuantity: plan.qty,
        previousQuantity: plan.prevQty,
        newQuantity: plan.newQty,
        reason: params.type === 'return' ? 'পণ্য ফেরত গ্রহণ' : 'বিক্রিতে স্টক মাইনাস',
        linkedTransactionId: txId,
        timestamp: now,
      });
    }

    const fullItems = params.items?.map(it => {
      const p = products.find(prod => prod.id === it.productId);
      return {
        productId: it.productId,
        productName: p?.name || '',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        costPrice: p?.costPrice || 0,
        unit: p?.unit || 'পিস',
        total: Math.round(it.quantity * it.unitPrice),
      };
    });

    const newTransaction: LedgerTransaction = {
      id: txId,
      storeId: 'store_imon_main',
      type: params.type,
      customerId: params.customerId,
      customerName: targetCustomer?.name || params.customerName,
      amount: finalAmount,
      costAmount: computedCost,
      previousBalance: prevBalance,
      newBalance: newBalance,
      description: params.description,
      items: fullItems,
      idempotencyKey: txIdempotencyKey,
      timestamp: now,
      createdAt: now,
      createdBy: 'owner',
    };

    existingTransactions.unshift(newTransaction);

    // Atomically commit to persistent store
    this.set(STORAGE_KEYS.PRODUCTS, products);
    this.set(STORAGE_KEYS.CUSTOMERS, customers);
    this.set(STORAGE_KEYS.MOVEMENTS, movements);
    this.set(STORAGE_KEYS.TRANSACTIONS, existingTransactions);

    return { success: true, transaction: newTransaction };
  }

  // --- Support Messages ---
  public static getSupportMessages(): SupportMessage[] {
    return this.get<SupportMessage[]>(STORAGE_KEYS.MESSAGES, []);
  }

  public static addSupportMessage(msg: Omit<SupportMessage, 'id' | 'timestamp'>): SupportMessage {
    const list = this.getSupportMessages();
    const newMsg: SupportMessage = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    list.unshift(newMsg);
    this.set(STORAGE_KEYS.MESSAGES, list);
    return newMsg;
  }

  public static markMessageRead(id: string): void {
    const list = this.getSupportMessages();
    const idx = list.findIndex(m => m.id === id);
    if (idx >= 0) {
      list[idx].isRead = true;
      this.set(STORAGE_KEYS.MESSAGES, list);
    }
  }

  // --- Notes & Reminders ---
  public static getNotes(): ShopNote[] {
    return this.get<ShopNote[]>(STORAGE_KEYS.NOTES, []);
  }

  public static saveNote(note: Omit<ShopNote, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): ShopNote {
    const notes = this.getNotes();
    const now = new Date().toISOString();
    let saved: ShopNote;

    if (note.id) {
      const idx = notes.findIndex(n => n.id === note.id);
      if (idx >= 0) {
        saved = {
          ...notes[idx],
          ...note,
          id: note.id,
          updatedAt: now,
        };
        notes[idx] = saved;
      } else {
        saved = {
          ...note,
          id: note.id,
          createdAt: now,
          updatedAt: now,
        };
        notes.push(saved);
      }
    } else {
      saved = {
        ...note,
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      notes.push(saved);
    }

    this.set(STORAGE_KEYS.NOTES, notes);
    return saved;
  }

  public static deleteNote(id: string): void {
    const notes = this.getNotes().filter(n => n.id !== id);
    this.set(STORAGE_KEYS.NOTES, notes);
  }

  // --- Backup and Restore ---
  public static exportFullBackup(): string {
    const payload = {
      version: '1.0.0',
      appName: 'ইমন স্টোর',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      transactions: this.getTransactions(),
      movements: this.getStockMovements(),
      messages: this.getSupportMessages(),
      notes: this.getNotes(),
    };
    return JSON.stringify(payload, null, 2);
  }

  public static importFullBackup(jsonString: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!data.settings || !Array.isArray(data.products) || !Array.isArray(data.customers)) {
        return { success: false, message: 'অকার্যকর ব্যাকআপ ফাইল কাঠামো।' };
      }
      this.set(STORAGE_KEYS.SETTINGS, data.settings);
      this.set(STORAGE_KEYS.PRODUCTS, data.products);
      this.set(STORAGE_KEYS.CUSTOMERS, data.customers);
      if (Array.isArray(data.transactions)) this.set(STORAGE_KEYS.TRANSACTIONS, data.transactions);
      if (Array.isArray(data.movements)) this.set(STORAGE_KEYS.MOVEMENTS, data.movements);
      if (Array.isArray(data.messages)) this.set(STORAGE_KEYS.MESSAGES, data.messages);
      if (Array.isArray(data.notes)) this.set(STORAGE_KEYS.NOTES, data.notes);
      return { success: true, message: 'সফলভাবে ডাটাবেজ রিস্টোর করা হয়েছে!' };
    } catch {
      return { success: false, message: 'ব্যাকআপ ফাইলটি পার্স করা যায়নি।' };
    }
  }

  public static getLastSyncTime(): string {
    return this.getStorageItem(STORAGE_KEYS.LAST_SYNC) || new Date().toISOString();
  }
}
