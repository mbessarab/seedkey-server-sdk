import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../src/services/auth.service';
import type {
  UserStoreAdapter,
  ChallengeStoreAdapter,
  SessionStoreAdapter,
  TokenGenerator,
} from '../../src/services/auth.service';
import { resolveConfig } from '../../src/types/config';
import type { User, StoredChallenge, TokenPair } from '../../src/types';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserStore: UserStoreAdapter;
  let mockChallengeStore: ChallengeStoreAdapter;
  let mockSessionStore: SessionStoreAdapter;
  let mockTokenGenerator: TokenGenerator;

  const testUser: User = {
    id: 'user_123',
    publicKey: {
      id: 'key_123',
      publicKey: 'dGVzdC1wdWJsaWMta2V5LWJhc2U2NA==',
      deviceName: 'Test Device',
      addedAt: Date.now(),
      lastUsed: Date.now(),
    },
    createdAt: Date.now(),
    lastLogin: Date.now(),
  };

  const testTokens: TokenPair = {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresIn: 3600,
  };

  beforeEach(() => {
    mockUserStore = {
      findById: vi.fn(),
      findByPublicKey: vi.fn(),
      create: vi.fn(),
      updateLastLogin: vi.fn(),
      publicKeyExists: vi.fn(),
    };

    mockChallengeStore = {
      save: vi.fn(),
      findById: vi.fn(),
      markAsUsed: vi.fn(),
      isNonceUsed: vi.fn(),
    };

    mockSessionStore = {
      create: vi.fn().mockResolvedValue({ id: 'session_123' }),
    };

    mockTokenGenerator = vi.fn().mockResolvedValue(testTokens);

    const config = resolveConfig({
      allowedDomains: ['example.com'],
      challengeTTL: 300000,
    });

    authService = new AuthService({
      config,
      users: mockUserStore,
      challenges: mockChallengeStore,
      sessions: mockSessionStore,
      generateTokens: mockTokenGenerator,
    });
  });

  describe('createChallenge', () => {
    it('should return error if publicKey is missing', async () => {
      const result = await authService.createChallenge({
        publicKey: '',
        action: 'authenticate',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('publicKey and action are required');
      }
    });

    it('should return error if action is invalid', async () => {
      const result = await authService.createChallenge({
        publicKey: 'test-key',
        action: 'invalid' as any,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('action must be "authenticate" or "register"');
      }
    });

    it('should return USER_NOT_FOUND for authenticate if user does not exist', async () => {
      vi.mocked(mockUserStore.findByPublicKey).mockResolvedValue(null);

      const result = await authService.createChallenge({
        publicKey: 'unknown-key',
        action: 'authenticate',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('USER_NOT_FOUND');
        expect(result.hint).toBe('register');
      }
    });

    it('should return USER_EXISTS for register if user already exists', async () => {
      vi.mocked(mockUserStore.publicKeyExists).mockResolvedValue(true);

      const result = await authService.createChallenge({
        publicKey: 'existing-key',
        action: 'register',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('USER_EXISTS');
        expect(result.hint).toBe('authenticate');
      }
    });

    it('should create challenge for valid authenticate request', async () => {
      vi.mocked(mockUserStore.findByPublicKey).mockResolvedValue(testUser);

      const result = await authService.createChallenge({
        publicKey: testUser.publicKey.publicKey,
        action: 'authenticate',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.challenge).toBeDefined();
        expect(result.challenge.action).toBe('authenticate');
        expect(result.challenge.domain).toBe('example.com');
        expect(result.challengeId).toMatch(/^ch_/);
      }

      expect(mockChallengeStore.save).toHaveBeenCalled();
    });

    it('should create challenge for valid register request', async () => {
      vi.mocked(mockUserStore.publicKeyExists).mockResolvedValue(false);

      const result = await authService.createChallenge({
        publicKey: 'new-public-key',
        action: 'register',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.challenge.action).toBe('register');
      }
    });
  });

  describe('getUser', () => {
    it('should return user by ID', async () => {
      vi.mocked(mockUserStore.findById).mockResolvedValue(testUser);

      const user = await authService.getUser('user_123');

      expect(user).toEqual(testUser);
      expect(mockUserStore.findById).toHaveBeenCalledWith('user_123');
    });

    it('should return null if user not found', async () => {
      vi.mocked(mockUserStore.findById).mockResolvedValue(null);

      const user = await authService.getUser('unknown');

      expect(user).toBeNull();
    });
  });
});

