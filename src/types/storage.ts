/**
 * Storage Interface Types
 * These interfaces define storage adapters for backends
 * Implementations can use any database (PostgreSQL, MongoDB, Redis, etc.)
 */

import type { StoredChallenge } from './challenge.js';
import type { Session } from './token.js';
import type { User, PublicKeyInfo, UserMetadata, KeyMetadata } from './user.js';

/**
 * User storage interface
 */
export interface UserStore {
  /** Find user by ID */
  findById(id: string): Promise<User | null>;

  /** Find user by public key */
  findByPublicKey(publicKey: string): Promise<User | null>;

  /** Create new user with a public key */
  create(publicKey: string, metadata?: UserMetadata): Promise<User>;

  /** Update last login timestamp */
  updateLastLogin(userId: string, publicKey: string): Promise<void>;

  /** Check if public key exists */
  publicKeyExists(publicKey: string): Promise<boolean>;

  /** Replace public key (for recovery) */
  replacePublicKey?(userId: string, newPublicKey: string, metadata?: KeyMetadata): Promise<PublicKeyInfo | null>;
}

/**
 * Challenge storage interface
 */
export interface ChallengeStore {
  /** Save challenge */
  save(challenge: StoredChallenge): Promise<void>;

  /** Find challenge by ID */
  findById(id: string): Promise<StoredChallenge | null>;

  /** Mark challenge as used */
  markAsUsed(id: string): Promise<boolean>;

  /** Check if nonce was used (replay protection) */
  isNonceUsed(nonce: string): Promise<boolean>;

  /** Delete challenge (optional cleanup) */
  delete?(id: string): Promise<void>;
}

/**
 * Session storage interface
 */
export interface SessionStore {
  /** Create new session */
  create(userId: string, publicKeyId: string, expiresInSeconds?: number): Promise<Session>;

  /** Find session by ID */
  findById(id: string): Promise<Session | null>;

  /** Invalidate session (logout) */
  invalidate(id: string): Promise<boolean>;

  /** Invalidate all sessions for user */
  invalidateAllForUser(userId: string): Promise<void>;

  /** Check if session is valid (not expired, not invalidated) */
  isValid(id: string): Promise<boolean>;
}

/**
 * All stores combined
 */
export interface SeedKeyStores {
  users: UserStore;
  challenges: ChallengeStore;
  sessions: SessionStore;
}

