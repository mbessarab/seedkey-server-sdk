import { describe, it, expect } from 'vitest';
import { generateNonce, generateId, generateToken } from '../../src/crypto/nonce';

describe('nonce utilities', () => {
  describe('generateNonce', () => {
    it('should generate a base64 string', () => {
      const nonce = generateNonce();
      expect(typeof nonce).toBe('string');
      // Base64 decodes without error
      const decoded = Buffer.from(nonce, 'base64');
      expect(decoded.length).toBe(32);
    });

    it('should generate unique nonces', () => {
      const nonces = new Set<string>();
      for (let i = 0; i < 100; i++) {
        nonces.add(generateNonce());
      }
      expect(nonces.size).toBe(100);
    });
  });

  describe('generateId', () => {
    it('should generate an ID with the given prefix', () => {
      const id = generateId('user');
      expect(id.startsWith('user_')).toBe(true);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId('test'));
      }
      expect(ids.size).toBe(100);
    });

    it('should work with different prefixes', () => {
      const userId = generateId('user');
      const challengeId = generateId('ch');
      const sessionId = generateId('session');

      expect(userId.startsWith('user_')).toBe(true);
      expect(challengeId.startsWith('ch_')).toBe(true);
      expect(sessionId.startsWith('session_')).toBe(true);
    });
  });

  describe('generateToken', () => {
    it('should generate a base64url token with default length', () => {
      const token = generateToken();
      expect(typeof token).toBe('string');
      // Base64url doesn't contain + or /
      expect(token).not.toContain('+');
      expect(token).not.toContain('/');
    });

    it('should generate tokens of specified length', () => {
      const token16 = generateToken(16);
      const token64 = generateToken(64);

      // Base64url encoding: 4 chars per 3 bytes, rounded up
      const decoded16 = Buffer.from(token16, 'base64url');
      const decoded64 = Buffer.from(token64, 'base64url');

      expect(decoded16.length).toBe(16);
      expect(decoded64.length).toBe(64);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateToken());
      }
      expect(tokens.size).toBe(100);
    });
  });
});

