/**
 * Authentication Service
 * Core business logic for authentication protocol
 * Framework-agnostic implementation
 */

import type {
  Challenge,
  StoredChallenge,
  ChallengeRequest,
  ChallengeResult,
  RegisterRequest,
  VerifyRequest,
  ResolvedConfig,
  TokenPair,
  User,
  PublicKeyInfo,
} from '../types/index.js';
import {
  SeedKeyError,
} from '../types/index.js';
import {
  generateNonce,
  generateId,
  verifyChallengeSignature,
  validateChallenge,
} from '../crypto/index.js';

/**
 * User storage adapter interface
 * Implementations provided by the backend
 */
export interface UserStoreAdapter {
  findById(id: string): Promise<User | null>;
  findByPublicKey(publicKey: string): Promise<User | null>;
  create(publicKey: string, metadata?: { deviceName?: string; extensionVersion?: string }): Promise<User>;
  updateLastLogin(userId: string, publicKey: string): Promise<void>;
  publicKeyExists(publicKey: string): Promise<boolean>;
}

/**
 * Challenge storage adapter interface
 */
export interface ChallengeStoreAdapter {
  save(challenge: StoredChallenge): Promise<void>;
  findById(id: string): Promise<StoredChallenge | null>;
  markAsUsed(id: string): Promise<boolean>;
  isNonceUsed(nonce: string): Promise<boolean>;
}

/**
 * Session storage adapter interface
 */
export interface SessionStoreAdapter {
  create(userId: string, publicKeyId: string, expiresInSeconds?: number): Promise<{ id: string }>;
}

/**
 * Token generator function type
 * Provided by the backend (framework-specific JWT implementation)
 */
export type TokenGenerator = (
  userId: string,
  publicKeyId: string,
  sessionId: string
) => Promise<TokenPair>;

/**
 * Dependencies for AuthService
 */
export interface AuthServiceDeps {
  config: ResolvedConfig;
  users: UserStoreAdapter;
  challenges: ChallengeStoreAdapter;
  sessions: SessionStoreAdapter;
  generateTokens: TokenGenerator;
}

/**
 * Result of successful registration
 */
export interface RegisterResult {
  success: true;
  user: User;
  keyInfo: PublicKeyInfo;
  session: { id: string };
  tokens: TokenPair;
}

/**
 * Result of successful verification (login)
 */
export interface VerifyResult {
  success: true;
  user: User;
  keyInfo: PublicKeyInfo;
  session: { id: string };
  tokens: TokenPair;
}

/**
 * Authentication Service
 * Implements core SeedKey authentication protocol
 */
export class AuthService {
  constructor(private deps: AuthServiceDeps) {}

  /**
   * Create authentication/registration challenge
   */
  async createChallenge(request: ChallengeRequest): Promise<ChallengeResult> {
    const { publicKey, action } = request;

    // Validation
    if (!publicKey || !action) {
      return { success: false, error: 'publicKey and action are required' };
    }

    if (action !== 'authenticate' && action !== 'register') {
      return { success: false, error: 'action must be "authenticate" or "register"' };
    }

    // For authentication, check user exists
    if (action === 'authenticate') {
      const user = await this.deps.users.findByPublicKey(publicKey);
      if (!user) {
        return { success: false, error: 'USER_NOT_FOUND', hint: 'register' };
      }
    }

    // For registration, check user does NOT exist
    if (action === 'register') {
      const exists = await this.deps.users.publicKeyExists(publicKey);
      if (exists) {
        return { success: false, error: 'USER_EXISTS', hint: 'authenticate' };
      }
    }

    // Create challenge
    const now = Date.now();
    const challengeId = generateId('ch');

    const challenge: Challenge = {
      nonce: generateNonce(),
      timestamp: now,
      domain: this.deps.config.currentDomain,
      action,
      expiresAt: now + this.deps.config.challengeTTL,
    };

    // Store challenge
    const storedChallenge: StoredChallenge = {
      ...challenge,
      id: challengeId,
      publicKey,
      used: false,
      createdAt: now,
    };
    await this.deps.challenges.save(storedChallenge);

    return { success: true, challenge, challengeId };
  }

  /**
   * Register new user
   */
  async register(request: RegisterRequest): Promise<RegisterResult> {
    const { publicKey, challenge, signature, metadata } = request;

    // Validation
    if (!publicKey || !challenge || !signature) {
      throw new SeedKeyError('VALIDATION_ERROR', 'publicKey, challenge, and signature are required');
    }

    if (challenge.action !== 'register') {
      throw new SeedKeyError('INVALID_CHALLENGE', 'Challenge action must be "register"');
    }

    // Check user doesn't exist
    const exists = await this.deps.users.publicKeyExists(publicKey);
    if (exists) {
      throw new SeedKeyError('USER_EXISTS', 'User with this public key already exists', 409, 'authenticate');
    }

    // Check nonce not used
    const nonceUsed = await this.deps.challenges.isNonceUsed(challenge.nonce);
    if (nonceUsed) {
      throw new SeedKeyError('NONCE_REUSED', 'This challenge has already been used');
    }

    // Validate challenge
    const validity = validateChallenge(challenge, this.deps.config.allowedDomains);
    if (!validity.valid) {
      throw new SeedKeyError('CHALLENGE_EXPIRED', validity.error || 'Challenge validation failed');
    }

    // Verify signature
    const isValid = await verifyChallengeSignature(challenge, signature, publicKey);
    if (!isValid) {
      throw new SeedKeyError('INVALID_SIGNATURE', 'Signature verification failed', 401);
    }

    // Create user
    const user = await this.deps.users.create(publicKey, metadata);
    const keyInfo = user.publicKey;

    // Mark nonce as used
    await this.deps.challenges.save({
      id: generateId('ch'),
      ...challenge,
      publicKey,
      used: true,
      createdAt: Date.now(),
    });

    // Create session and tokens
    const session = await this.deps.sessions.create(user.id, keyInfo.id);
    const tokens = await this.deps.generateTokens(user.id, keyInfo.id, session.id);

    return { success: true, user, keyInfo, session, tokens };
  }

  /**
   * Verify signature and authenticate user
   */
  async verify(request: VerifyRequest): Promise<VerifyResult> {
    const { challengeId, challenge, signature, publicKey } = request;

    // Validation
    if (!challengeId || !challenge || !signature || !publicKey) {
      throw new SeedKeyError('VALIDATION_ERROR', 'challengeId, challenge, signature, and publicKey are required');
    }

    if (challenge.action !== 'authenticate') {
      throw new SeedKeyError('INVALID_CHALLENGE', 'Challenge action must be "authenticate"');
    }

    // Find stored challenge
    const storedChallenge = await this.deps.challenges.findById(challengeId);
    if (!storedChallenge) {
      throw new SeedKeyError('CHALLENGE_NOT_FOUND', 'Challenge not found');
    }

    // Check not used
    if (storedChallenge.used) {
      throw new SeedKeyError('NONCE_REUSED', 'This challenge has already been used');
    }

    // Check nonce not reused
    const nonceUsed = await this.deps.challenges.isNonceUsed(challenge.nonce);
    if (nonceUsed) {
      throw new SeedKeyError('NONCE_REUSED', 'This challenge has already been used');
    }

    // Validate challenge
    const validity = validateChallenge(challenge, this.deps.config.allowedDomains);
    if (!validity.valid) {
      throw new SeedKeyError('CHALLENGE_EXPIRED', validity.error || 'Challenge validation failed');
    }

    // Find user
    const user = await this.deps.users.findByPublicKey(publicKey);
    if (!user) {
      throw new SeedKeyError('USER_NOT_FOUND', 'No user found with this public key', 404, 'register');
    }

    // Verify signature
    const isValid = await verifyChallengeSignature(challenge, signature, publicKey);
    if (!isValid) {
      throw new SeedKeyError('INVALID_SIGNATURE', 'Signature verification failed', 401);
    }

    // Mark challenge as used
    await this.deps.challenges.markAsUsed(challengeId);

    // Update last login
    await this.deps.users.updateLastLogin(user.id, publicKey);

    // Get key info
    const keyInfo = user.publicKey;

    // Create session and tokens
    const session = await this.deps.sessions.create(user.id, keyInfo.id);
    const tokens = await this.deps.generateTokens(user.id, keyInfo.id, session.id);

    return { success: true, user, keyInfo, session, tokens };
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    return this.deps.users.findById(userId);
  }
}

