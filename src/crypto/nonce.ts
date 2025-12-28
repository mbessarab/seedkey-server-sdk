/**
 * Nonce and ID generation utilities
 */

import crypto from 'crypto';

/**
 * Generate random nonce (32 bytes in base64)
 */
export function generateNonce(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Generate unique ID with prefix
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}${random}`;
}

/**
 * Generate secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

