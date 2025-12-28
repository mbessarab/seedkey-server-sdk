/**
 * Ed25519 cryptography utilities
 */

import * as ed from '@noble/ed25519';
import crypto from 'crypto';

// Setup sha512 for ed25519 (using Node.js crypto)
ed.etc.sha512Sync = (...m: Uint8Array[]) => {
  const hash = crypto.createHash('sha512');
  for (const msg of m) {
    hash.update(msg);
  }
  return new Uint8Array(hash.digest());
};

/**
 * Verify Ed25519 signature
 */
export async function verifySignature(
  signature: string,
  message: string,
  publicKey: string
): Promise<boolean> {
  try {
    const signatureBytes = Buffer.from(signature, 'base64');
    const messageBytes = new TextEncoder().encode(message);
    const publicKeyBytes = Buffer.from(publicKey, 'base64');

    // Check public key length (Ed25519 = 32 bytes)
    if (publicKeyBytes.length !== 32) {
      return false;
    }

    // Check signature length (Ed25519 = 64 bytes)
    if (signatureBytes.length !== 64) {
      return false;
    }

    return await ed.verifyAsync(signatureBytes, messageBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

/**
 * Secure string comparison (timing attack protection)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

