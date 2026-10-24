import { describe, expect, it, beforeEach } from 'vitest';
import { StorageService } from '../services/storage';
import { formatTaka, toBengaliNumber, formatDhakaDate } from '../utils/formatters';
import { parseVoiceCommand, parseBengaliAmount } from '../utils/voice';
import { hashPin, verifyPin } from '../utils/security';

describe('ইমন স্টোর (Imon Store) - Core Business Logic & Tests', () => {
  beforeEach(() => {
    StorageService.clear();
    StorageService.init();
  });

  describe('1. Bengali Formatting & Asia/Dhaka DateTime', () => {
    it('converts numbers to Bengali digits correctly', () => {
      expect(toBengaliNumber(0)).toBe('০');
      expect(toBengaliNumber(12345)).toBe('১২৩৪৫');
      expect(toBengaliNumber(9870)).toBe('৯৮৭০');
    });

    it('formats Taka with proper currency symbol and commas', () => {
      expect(formatTaka(500)).toBe('৳ ৫০০');
      expect(formatTaka(150000)).toBe('৳ ১,৫০,০০০');
    });

    it('formats dates in Asia/Dhaka timezone', () => {
      const iso = '2026-10-23T14:30:00Z';
      const formatted = formatDhakaDate(iso);
      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe('2. Security & PIN Cryptography', () => {
    it('securely hashes and verifies 4-digit PIN with salt', async () => {
      const pin = '4321';
      const salt = 'custom_salt_123';
      const hashed = await hashPin(pin, salt);
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(pin);
      expect(hashed.length).toBe(64); // SHA-256 output length in hex

      const isValid = await verifyPin(pin, hashed, salt);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPin('9999', hashed, salt);
      expect(isInvalid).toBe(false);
    });
  });

  describe('3. Credit Sale, Partial Payment & Customer Balance', () => {
    it('increases customer balance when credit sale (বাকি দিলাম) is executed', () => {
      const customers = StorageService.getCustomers();
      const testCust = customers[0]; // rahim
      const initialBalance = testCust.currentBalance;

      const result = StorageService.executeTransaction({
        type: 'credit_sale_given',
        customerId: testCust.id,
        amount: 500,
        description: 'সয়াবিন তেল বাকি',
      });

      expect(result.success).toBe(true);
      const updatedCust = StorageService.getCustomer(testCust.id);
      expect(updatedCust?.currentBalance).toBe(initialBalance + 500);
    });

    it('decreases customer balance when payment collection (বাকি পেলাম) is executed', () => {
      const customers = StorageService.getCustomers();
      const testCust = customers[0];
      const initialBalance = testCust.currentBalance;

      const result = StorageService.executeTransaction({
        type: 'credit_payment_collected',
        customerId: testCust.id,
        amount: 300,
        description: '৩০০ টাকা কিস্তি পরিশোধ',
      });

      expect(result.success).toBe(true);
      const updatedCust = StorageService.getCustomer(testCust.id);
      expect(updatedCust?.currentBalance).toBe(initialBalance - 300);
    });
  });

  describe('4. Inventory Reduction, Restoration & Overrides', () => {
    it('reduces product inventory and records stock movement on sale', () => {
      const products = StorageService.getProducts();
      const testProd = products[0];
      const initialStock = testProd.stockQuantity;

      const result = StorageService.executeTransaction({
        type: 'cash_sale',
        amount: testProd.salePrice * 2,
        description: '২ বোতল তেল নগদ বিক্রি',
        items: [{ productId: testProd.id, quantity: 2, unitPrice: testProd.salePrice }],
      });

      expect(result.success).toBe(true);
      const updatedProd = StorageService.getProduct(testProd.id);
      expect(updatedProd?.stockQuantity).toBe(initialStock - 2);

      const movements = StorageService.getStockMovements();
      const lastMovement = movements[movements.length - 1];
      expect(lastMovement.productId).toBe(testProd.id);
      expect(lastMovement.changeQuantity).toBe(-2);
    });

    it('rejects sale exceeding available stock unless override is configured', () => {
      const products = StorageService.getProducts();
      const lowStockProd = products.find(p => p.stockQuantity < 10)!;

      const result = StorageService.executeTransaction({
        type: 'cash_sale',
        amount: 10000,
        description: 'অতিরিক্ত বিক্রি পরীক্ষা',
        items: [{ productId: lowStockProd.id, quantity: lowStockProd.stockQuantity + 50, unitPrice: lowStockProd.salePrice }],
        allowStockOverride: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('পর্যাপ্ত স্টক নেই');
    });

    it('restores stock when product return is processed', () => {
      const products = StorageService.getProducts();
      const testProd = products[0];
      const currentStock = testProd.stockQuantity;

      const result = StorageService.executeTransaction({
        type: 'return',
        amount: testProd.salePrice,
        description: '১ পিস ফেরত গ্রহণ',
        items: [{ productId: testProd.id, quantity: 1, unitPrice: testProd.salePrice }],
      });

      expect(result.success).toBe(true);
      const updatedProd = StorageService.getProduct(testProd.id);
      expect(updatedProd?.stockQuantity).toBe(currentStock + 1);
    });
  });

  describe('5. Duplicate Submission Guard (Idempotency Key)', () => {
    it('prevents executing the exact same transaction twice', () => {
      const key = 'test_idempotency_unique_123';
      const res1 = StorageService.executeTransaction({
        type: 'cash_sale',
        amount: 250,
        description: 'চা পাতা বিক্রি',
        idempotencyKey: key,
      });

      const res2 = StorageService.executeTransaction({
        type: 'cash_sale',
        amount: 250,
        description: 'চা পাতা বিক্রি',
        idempotencyKey: key,
      });

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(res1.transaction?.id).toBe(res2.transaction?.id);
    });
  });

  describe('6. Customer Share Token & Isolation', () => {
    it('generates high entropy share token and allows regenerating/revoking token', () => {
      const customers = StorageService.getCustomers();
      const cust = customers[0];
      const originalToken = cust.shareToken;

      const found = StorageService.getCustomerByShareToken(originalToken);
      expect(found?.id).toBe(cust.id);

      const newToken = StorageService.regenerateCustomerShareToken(cust.id);
      expect(newToken).not.toBe(originalToken);

      const oldSearch = StorageService.getCustomerByShareToken(originalToken);
      expect(oldSearch).toBeUndefined();

      const newSearch = StorageService.getCustomerByShareToken(newToken);
      expect(newSearch?.id).toBe(cust.id);
    });
  });

  describe('7. Voice Command Parsing', () => {
    it('parses credit sale voice command correctly', () => {
      const customers = StorageService.getCustomers();
      const parsed = parseVoiceCommand('রহিম এর নামে একশ টাকা বাকি লিখো', customers);
      expect(parsed.isValid).toBe(true);
      expect(parsed.action).toBe('credit_sale_given');
      expect(parsed.amount).toBe(100);
      expect(parsed.customerName).toContain('রহিম');
    });

    it('parses payment collection command correctly', () => {
      const customers = StorageService.getCustomers();
      const parsed = parseVoiceCommand('করিম পঞ্চাশ টাকা দিয়েছে', customers);
      expect(parsed.isValid).toBe(true);
      expect(parsed.action).toBe('credit_payment_collected');
      expect(parsed.amount).toBe(50);
    });

    it('parses total sales query', () => {
      const customers = StorageService.getCustomers();
      const parsed = parseVoiceCommand('আজকের মোট বিক্রি কত', customers);
      expect(parsed.isValid).toBe(true);
      expect(parsed.action).toBe('query_sales');
    });
  });
});
