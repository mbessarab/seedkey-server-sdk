import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as ed from '@noble/ed25519';
import crypto from 'crypto';
import {
  canonicalizeChallenge,
  verifyChallengeSignature,
  validateChallenge,
} from '../../src/crypto/challenge';
import type { Challenge } from '../../src/types/challenge';

// Setup sha512 for ed25519
ed.etc.sha512Sync = (...m: Uint8Array[]) => {
  const hash = crypto.createHash('sha512');
  for (const msg of m) {
    hash.update(msg);
  }
  return new Uint8Array(hash.digest());
};

describe('challenge utilities', () => {
  const createTestChallenge = (overrides: Partial<Challenge> = {}): Challenge => ({
    nonce: 'test-nonce-base64',
    timestamp: Date.now(),
    domain: 'example.com',
    action: 'authenticate',
    expiresAt: Date.now() + 300000, // 5 minutes
    ...overrides,
  });

  describe('canonicalizeChallenge', () => {
    it('should create a deterministic JSON representation', () => {
      const challenge = createTestChallenge({
        nonce: 'abc123',
        timestamp: 1000000,
        domain: 'test.com',
        action: 'authenticate',
        expiresAt: 2000000,
      });

      const canonical = canonicalizeChallenge(challenge);
      const parsed = JSON.parse(canonical);

      // Keys should be in sorted order
      const keys = Object.keys(parsed);
      expect(keys).toEqual(['action', 'domain', 'expiresAt', 'nonce', 'timestamp']);
    });

    it('should produce the same output for the same input', () => {
      const challenge = createTestChallenge();
      const canonical1 = canonicalizeChallenge(challenge);
      const canonical2 = canonicalizeChallenge(challenge);

      expect(canonical1).toBe(canonical2);
    });
  });

  describe('verifyChallengeSignature', () => {
    it('should verify a valid challenge signature', async () => {
      // Generate keypair
      const privateKey = ed.utils.randomPrivateKey();
      const publicKey = await ed.getPublicKeyAsync(privateKey);

      const challenge = createTestChallenge();
      const canonical = canonicalizeChallenge(challenge);

      // Sign the canonical challenge
      const messageBytes = new TextEncoder().encode(canonical);
      const signature = await ed.signAsync(messageBytes, privateKey);

      const signatureBase64 = Buffer.from(signature).toString('base64');
      const publicKeyBase64 = Buffer.from(publicKey).toString('base64');

      const isValid = await verifyChallengeSignature(challenge, signatureBase64, publicKeyBase64);
      expect(isValid).toBe(true);
    });

    it('should reject signature for modified challenge', async () => {
      const privateKey = ed.utils.randomPrivateKey();
      const publicKey = await ed.getPublicKeyAsync(privateKey);

      const challenge = createTestChallenge();
      const canonical = canonicalizeChallenge(challenge);

      const messageBytes = new TextEncoder().encode(canonical);
      const signature = await ed.signAsync(messageBytes, privateKey);

      const signatureBase64 = Buffer.from(signature).toString('base64');
      const publicKeyBase64 = Buffer.from(publicKey).toString('base64');

      // Modify the challenge
      const modifiedChallenge = { ...challenge, domain: 'evil.com' };

      const isValid = await verifyChallengeSignature(modifiedChallenge, signatureBase64, publicKeyBase64);
      expect(isValid).toBe(false);
    });
  });

  describe('validateChallenge', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should validate a valid challenge', () => {
      const now = 1000000;
      vi.setSystemTime(now);

      const challenge = createTestChallenge({
        timestamp: now,
        expiresAt: now + 300000,
        domain: 'example.com',
      });

      const result = validateChallenge(challenge, ['example.com']);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject expired challenge', () => {
      const now = 1000000;
      vi.setSystemTime(now);

      const challenge = createTestChallenge({
        timestamp: now - 600000,
        expiresAt: now - 100, // Expired
      });

      const result = validateChallenge(challenge);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Challenge expired');
    });

    it('should reject challenge with future timestamp', () => {
      const now = 1000000;
      vi.setSystemTime(now);

      const challenge = createTestChallenge({
        timestamp: now + 60000, // 1 minute in the future (beyond 30s tolerance)
        expiresAt: now + 300000,
      });

      const result = validateChallenge(challenge);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Challenge timestamp is in the future');
    });

    it('should allow timestamp within 30 second tolerance', () => {
      const now = 1000000;
      vi.setSystemTime(now);

      const challenge = createTestChallenge({
        timestamp: now + 20000, // 20 seconds in the future (within tolerance)
        expiresAt: now + 300000,
      });

      const result = validateChallenge(challenge);
      expect(result.valid).toBe(true);
    });

    it('should reject challenge with wrong domain', () => {
      const now = 1000000;
      vi.setSystemTime(now);

      const challenge = createTestChallenge({
        timestamp: now,
        expiresAt: now + 300000,
        domain: 'evil.com',
      });

      const result = validateChallenge(challenge, ['example.com', 'trusted.com']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Domain mismatch');
    });

    it('should accept challenge with matching domain from array', () => {
      const now = 1000000;
      vi.setSystemTime(now);

      const challenge = createTestChallenge({
        timestamp: now,
        expiresAt: now + 300000,
        domain: 'trusted.com',
      });

      const result = validateChallenge(challenge, ['example.com', 'trusted.com']);
      expect(result.valid).toBe(true);
    });

    it('should work with string domain parameter', () => {
      const now = 1000000;
      vi.setSystemTime(now);

      const challenge = createTestChallenge({
        timestamp: now,
        expiresAt: now + 300000,
        domain: 'example.com',
      });

      const result = validateChallenge(challenge, 'example.com');
      expect(result.valid).toBe(true);
    });

    it('should skip domain validation if no domains specified', () => {
      const now = 1000000;
      vi.setSystemTime(now);

      const challenge = createTestChallenge({
        timestamp: now,
        expiresAt: now + 300000,
        domain: 'any-domain.com',
      });

      const result = validateChallenge(challenge);
      expect(result.valid).toBe(true);
    });
  });
});

