/**
 * Challenge action type
 */
export type ChallengeAction = 'register' | 'authenticate';

/**
 * Challenge for authentication/registration
 */
export interface Challenge {
  /** Random nonce (32 bytes in base64) */
  nonce: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Domain that issued the challenge */
  domain: string;
  /** Action type */
  action: ChallengeAction;
  /** Expiration timestamp (Unix timestamp in milliseconds) */
  expiresAt: number;
}

/**
 * Stored challenge with additional metadata
 */
export interface StoredChallenge extends Challenge {
  /** Unique challenge ID */
  id: string;
  /** Public key that requested the challenge */
  publicKey?: string;
  /** Whether the challenge has been used */
  used: boolean;
  /** When the challenge was created (Unix timestamp in milliseconds) */
  createdAt: number;
}

/**
 * Challenge request from client
 */
export interface ChallengeRequest {
  /** Public key in base64 */
  publicKey: string;
  /** Action type */
  action: ChallengeAction;
}

/**
 * Result of challenge creation
 */
export type ChallengeResult = 
  | { success: true; challenge: Challenge; challengeId: string }
  | { success: false; error: string; hint?: string };

