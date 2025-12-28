import { describe, it, expect } from 'vitest';
import * as ed from '@noble/ed25519';
import crypto from 'crypto';
import { verifySignature, secureCompare } from '../../src/crypto/ed25519';

// Setup sha512 for ed25519
ed.etc.sha512Sync = (...m: Uint8Array[]) => {
  const hash = crypto.createHash('sha512');
  for (const msg of m) {
    hash.update(msg);
  }
  return new Uint8Array(hash.digest());
};

describe('ed25519', () => {
  describe('verifySignature', () => {
    it('should verify a valid signature', async () => {
      // Generate keypair
      const privateKey = ed.utils.randomPrivateKey();
      const publicKey = await ed.getPublicKeyAsync(privateKey);

      // Sign message
      const message = 'Hello, World!';
      const messageBytes = new TextEncoder().encode(message);
      const signature = await ed.signAsync(messageBytes, privateKey);

      // Verify
      const signatureBase64 = Buffer.from(signature).toString('base64');
      const publicKeyBase64 = Buffer.from(publicKey).toString('base64');

      const isValid = await verifySignature(signatureBase64, message, publicKeyBase64);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid signature', async () => {
      // Generate keypair
      const privateKey = ed.utils.randomPrivateKey();
      const publicKey = await ed.getPublicKeyAsync(privateKey);

      // Sign message
      const message = 'Hello, World!';
      const messageBytes = new TextEncoder().encode(message);
      const signature = await ed.signAsync(messageBytes, privateKey);

      // Verify with different message
      const signatureBase64 = Buffer.from(signature).toString('base64');
      const publicKeyBase64 = Buffer.from(publicKey).toString('base64');

      const isValid = await verifySignature(signatureBase64, 'Different message', publicKeyBase64);
      expect(isValid).toBe(false);
    });

    it('should reject signature from different key', async () => {
      // Generate two keypairs
      const privateKey1 = ed.utils.randomPrivateKey();
      const privateKey2 = ed.utils.randomPrivateKey();
      const publicKey2 = await ed.getPublicKeyAsync(privateKey2);

      // Sign with key1
      const message = 'Hello, World!';
      const messageBytes = new TextEncoder().encode(message);
      const signature = await ed.signAsync(messageBytes, privateKey1);

      // Verify with key2
      const signatureBase64 = Buffer.from(signature).toString('base64');
      const publicKeyBase64 = Buffer.from(publicKey2).toString('base64');

      const isValid = await verifySignature(signatureBase64, message, publicKeyBase64);
      expect(isValid).toBe(false);
    });

    it('should reject invalid public key length', async () => {
      const invalidPublicKey = Buffer.from('short').toString('base64');
      const signature = Buffer.alloc(64).toString('base64');

      const isValid = await verifySignature(signature, 'test', invalidPublicKey);
      expect(isValid).toBe(false);
    });

    it('should reject invalid signature length', async () => {
      const privateKey = ed.utils.randomPrivateKey();
      const publicKey = await ed.getPublicKeyAsync(privateKey);
      const publicKeyBase64 = Buffer.from(publicKey).toString('base64');
      const invalidSignature = Buffer.from('short').toString('base64');

      const isValid = await verifySignature(invalidSignature, 'test', publicKeyBase64);
      expect(isValid).toBe(false);
    });

    it('should handle malformed base64 gracefully', async () => {
      const isValid = await verifySignature('not-valid-base64!!!', 'test', 'also-invalid!!!');
      expect(isValid).toBe(false);
    });
  });

  describe('secureCompare', () => {
    it('should return true for equal strings', () => {
      expect(secureCompare('hello', 'hello')).toBe(true);
      expect(secureCompare('', '')).toBe(true);
      expect(secureCompare('a', 'a')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(secureCompare('hello', 'world')).toBe(false);
      expect(secureCompare('hello', 'Hello')).toBe(false);
      expect(secureCompare('a', 'b')).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      expect(secureCompare('hello', 'hell')).toBe(false);
      expect(secureCompare('short', 'longer')).toBe(false);
      expect(secureCompare('', 'a')).toBe(false);
    });
  });
});

