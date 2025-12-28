/**
 * Challenge utilities
 */

import type { Challenge } from '../types/index.js';
import { verifySignature } from './ed25519.js';

/**
 * Create canonical representation of challenge for signing/verification
 */
export function canonicalizeChallenge(challenge: Challenge): string {
  const sortedKeys = ['action', 'domain', 'expiresAt', 'nonce', 'timestamp'] as const;
  const canonical: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    canonical[key] = challenge[key];
  }

  return JSON.stringify(canonical);
}

/**
 * Verify challenge signature
 */
export async function verifyChallengeSignature(
  challenge: Challenge,
  signature: string,
  publicKey: string
): Promise<boolean> {
  const canonicalChallenge = canonicalizeChallenge(challenge);
  return verifySignature(signature, canonicalChallenge, publicKey);
}

/**
 * Validate challenge (expiration, domain, timestamp)
 */
export interface ChallengeValidation {
  valid: boolean;
  error?: string;
}

export function validateChallenge(
  challenge: Challenge,
  allowedDomains?: string | string[]
): ChallengeValidation {
  const now = Date.now();

  // Check expiration
  if (now > challenge.expiresAt) {
    return { valid: false, error: 'Challenge expired' };
  }

  // Check timestamp not from future (with 30 second tolerance)
  if (challenge.timestamp > now + 30000) {
    return { valid: false, error: 'Challenge timestamp is in the future' };
  }

  // Check domain if specified
  if (allowedDomains) {
    const domains = Array.isArray(allowedDomains) ? allowedDomains : [allowedDomains];
    if (!domains.includes(challenge.domain)) {
      return { valid: false, error: `Domain mismatch. Allowed: ${domains.join(', ')}` };
    }
  }

  return { valid: true };
}

