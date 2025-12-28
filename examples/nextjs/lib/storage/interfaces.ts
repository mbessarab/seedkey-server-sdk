/**
 * Storage Interfaces
 */

import type { StoredChallenge, Session, PublicKeyInfo, KeyMetadata, UserMetadata } from '@seedkey/sdk-server';

export interface User {
  id: string;
  publicKey: PublicKeyInfo;
  createdAt: number;
  lastLogin?: number;
}

export interface UserStore {
  findById(id: string): Promise<User | null>;
  findByPublicKey(publicKey: string): Promise<User | null>;
  create(publicKey: string, metadata?: UserMetadata): Promise<User>;
  updateLastLogin(userId: string, publicKey: string): Promise<void>;
  replacePublicKey(userId: string, newPublicKey: string, metadata?: KeyMetadata): Promise<PublicKeyInfo | null>;
  publicKeyExists(publicKey: string): Promise<boolean>;
}

export interface ChallengeStore {
  save(challenge: StoredChallenge): Promise<void>;
  findById(id: string): Promise<StoredChallenge | null>;
  markAsUsed(id: string): Promise<boolean>;
  isNonceUsed(nonce: string): Promise<boolean>;
}

export interface SessionStore {
  create(userId: string, publicKeyId: string, expiresInSeconds?: number): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  invalidate(id: string): Promise<boolean>;
  invalidateAllForUser(userId: string): Promise<void>;
  isValid(id: string): Promise<boolean>;
}

export interface SeedKeyStores {
  users: UserStore;
  challenges: ChallengeStore;
  sessions: SessionStore;
}

