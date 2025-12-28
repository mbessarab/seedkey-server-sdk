import { describe, it, expect } from 'vitest';
import { resolveConfig, DEFAULT_CONFIG } from '../../src/types/config';

describe('config', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have default challengeTTL of 5 minutes', () => {
      expect(DEFAULT_CONFIG.challengeTTL).toBe(5 * 60 * 1000);
    });
  });

  describe('resolveConfig', () => {
    it('should use provided values', () => {
      const config = resolveConfig({
        allowedDomains: ['example.com', 'test.com'],
        challengeTTL: 60000,
        currentDomain: 'test.com',
      });

      expect(config.allowedDomains).toEqual(['example.com', 'test.com']);
      expect(config.challengeTTL).toBe(60000);
      expect(config.currentDomain).toBe('test.com');
    });

    it('should use default challengeTTL when not provided', () => {
      const config = resolveConfig({
        allowedDomains: ['example.com'],
      });

      expect(config.challengeTTL).toBe(DEFAULT_CONFIG.challengeTTL);
    });

    it('should use first allowed domain as currentDomain when not provided', () => {
      const config = resolveConfig({
        allowedDomains: ['primary.com', 'secondary.com'],
      });

      expect(config.currentDomain).toBe('primary.com');
    });

    it('should override currentDomain when explicitly provided', () => {
      const config = resolveConfig({
        allowedDomains: ['primary.com', 'secondary.com'],
        currentDomain: 'secondary.com',
      });

      expect(config.currentDomain).toBe('secondary.com');
    });
  });
});

