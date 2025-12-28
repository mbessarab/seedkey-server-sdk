/**
 * Token Types
 */

export type TokenType = 'access' | 'refresh';

/**
 * JWT token payload
 */
export interface TokenPayload {
  /** User ID (subject) */
  sub: string;
  /** Token type */
  type: TokenType;
  /** Public key ID used for authentication */
  publicKeyId: string;
  /** Session ID */
  sessionId: string;
  /** Issued at timestamp */
  iat?: number;
  /** Expiration timestamp */
  exp?: number;
}

/**
 * Token pair (access + refresh)
 */
export interface TokenPair {
  /** Access token */
  accessToken: string;
  /** Refresh token */
  refreshToken: string;
  /** Expiration time in seconds */
  expiresIn: number;
}

/**
 * Session entity
 */
export interface Session {
  /** Session ID */
  id: string;
  /** User ID */
  userId: string;
  /** Public key ID */
  publicKeyId: string;
  /** When the session was created (Unix timestamp in milliseconds) */
  createdAt: number;
  /** When the session expires (Unix timestamp in milliseconds) */
  expiresAt: number;
  /** Whether the session is invalidated */
  invalidated: boolean;
}

