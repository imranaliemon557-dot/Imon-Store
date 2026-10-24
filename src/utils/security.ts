/**
 * Security & Cryptography Utilities for ইমন স্টোর
 */

export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${pin}:imon_store_v1`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export function generateShareToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export function generateIdempotencyKey(): string {
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  const randomPart = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  return `tx_${Date.now()}_${randomPart}`;
}

export async function verifyPin(pin: string, storedHash: string, salt: string): Promise<boolean> {
  if (!storedHash || !salt) return false;
  const computedHash = await hashPin(pin, salt);
  return computedHash === storedHash;
}
