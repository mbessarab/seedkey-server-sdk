/**
 * In-Memory Storage Implementations
 */

import type {
  StoredChallenge,
  Session,
  PublicKeyInfo,
  KeyMetadata,
  UserMetadata,
  User,
  UserStore,
  ChallengeStore,
  SessionStore,
  SeedKeyStores,
} from '@seedkey/sdk-server';
import { generateId } from '@seedkey/sdk-server';

export type { SeedKeyStores } from '@seedkey/sdk-server';

/**
 * In-Memory User Store
 */
class MemoryUserStore implements UserStore {
  private users = new Map<string, User>();
  private publicKeyIndex = new Map<string, string>();

  async replacePublicKey(userId: string, newPublicKey: string, metadata?: KeyMetadata): Promise<PublicKeyInfo | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    // Remove old key from index
    if (user.publicKey) {
      this.publicKeyIndex.delete(user.publicKey.publicKey);
    }

    // Create new key
    const keyId = generateId('key');
    const now = Date.now();

    const keyInfo: PublicKeyInfo = {
      id: keyId,
      publicKey: newPublicKey,
      deviceName: metadata?.deviceName,
      addedAt: now,
      lastUsed: now,
    };
    // Replace the key
    user.publicKey = keyInfo;
    this.publicKeyIndex.set(newPublicKey, userId);
    return keyInfo;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByPublicKey(publicKey: string): Promise<User | null> {
    const userId = this.publicKeyIndex.get(publicKey);
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  async create(publicKey: string, metadata?: UserMetadata): Promise<User> {
    const userId = generateId('user');
    const keyId = generateId('key');
    const now = Date.now();

    const keyInfo: PublicKeyInfo = {
      id: keyId,
      publicKey,
      deviceName: metadata?.deviceName,
      addedAt: now,
      lastUsed: now,
    };

    const user: User = {
      id: userId,
      publicKey: keyInfo,
      createdAt: now,
      lastLogin: now,
    };

    this.users.set(userId, user);
    this.publicKeyIndex.set(publicKey, userId);
    return user;
  }

  async updateLastLogin(userId: string, publicKey: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;

    user.lastLogin = Date.now();
    if (user.publicKey.publicKey === publicKey) {
      user.publicKey.lastUsed = Date.now();
    }
  }

  async addPublicKey(userId: string, publicKey: string, metadata?: KeyMetadata): Promise<PublicKeyInfo | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    const keyId = generateId('key');
    const now = Date.now();

    const keyInfo: PublicKeyInfo = {
      id: keyId,
      publicKey,
      deviceName: metadata?.deviceName,
      addedAt: now,
      lastUsed: now,
    };

    user.publicKey = keyInfo;
    this.publicKeyIndex.set(publicKey, userId);
    return keyInfo;
  }

  async removePublicKey(userId: string, keyId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    const keyIndex = user.publicKey.id === keyId;
    if (!keyIndex) return false;

    // Single-key model: do not allow removing the last key in this example.
    return false;
  }

  async publicKeyExists(publicKey: string): Promise<boolean> {
    return this.publicKeyIndex.has(publicKey);
  }
}

/**
 * In-Memory Challenge Store
 */
class MemoryChallengeStore implements ChallengeStore {
  private challenges = new Map<string, StoredChallenge>();
  private usedNonces = new Set<string>();

  async save(challenge: StoredChallenge): Promise<void> {
    this.challenges.set(challenge.id, challenge);
    if (challenge.used) {
      this.usedNonces.add(challenge.nonce);
    }
  }

  async findById(id: string): Promise<StoredChallenge | null> {
    return this.challenges.get(id) || null;
  }

  async markAsUsed(id: string): Promise<boolean> {
    const challenge = this.challenges.get(id);
    if (!challenge) return false;

    challenge.used = true;
    this.usedNonces.add(challenge.nonce);
    return true;
  }

  async isNonceUsed(nonce: string): Promise<boolean> {
    return this.usedNonces.has(nonce);
  }
}

/**
 * In-Memory Session Store
 */
interface MemorySession extends Session {
  isValid: boolean;
}

class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, MemorySession>();

  async create(userId: string, publicKeyId: string, expiresInSeconds?: number): Promise<Session> {
    const sessionId = generateId('ses');
    const now = Date.now();
    const expiresAt = expiresInSeconds
      ? now + expiresInSeconds * 1000
      : now + 30 * 24 * 60 * 60 * 1000;

    const session: MemorySession = {
      id: sessionId,
      userId,
      publicKeyId,
      createdAt: now,
      expiresAt,
      invalidated: false,
      isValid: true,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async findById(id: string): Promise<Session | null> {
    return this.sessions.get(id) || null;
  }

  async invalidate(id: string): Promise<boolean> {
    const session = this.sessions.get(id);
    if (!session) return false;

    session.isValid = false;
    session.invalidated = true;
    return true;
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        session.isValid = false;
        session.invalidated = true;
      }
    }
  }

  async isValid(id: string): Promise<boolean> {
    const session = this.sessions.get(id);
    if (!session) return false;
    if (!session.isValid || session.invalidated) return false;
    if (Date.now() > session.expiresAt) return false;
    return true;
  }
}

// Singleton stores (persisted across requests in development)
let stores: SeedKeyStores | null = null;

/**
 * Get or create in-memory stores
 */
export function getStores(): SeedKeyStores {
  if (!stores) {
    stores = {
      users: new MemoryUserStore(),
      challenges: new MemoryChallengeStore(),
      sessions: new MemorySessionStore(),
    };
  }
  return stores;
}

