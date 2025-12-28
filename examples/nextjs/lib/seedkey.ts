/**
 * SeedKey SDK configuration for Next.js
 * Single key per user (mirrors self-hosted backend)
 */

import {
  AuthService,
  resolveConfig,
  ERROR_CODES,
  type TokenPair,
  type TokenPayload,
} from '@seedkey/sdk-server';
import { SignJWT, jwtVerify } from 'jose';
import { getStores } from './storage/memory';

// ============================================================================
// Configuration
// ============================================================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const ACCESS_TOKEN_TTL = 3600; // 1 hour
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days

export const config = resolveConfig({
  allowedDomains: ['localhost', process.env.NEXT_PUBLIC_DOMAIN || 'example.com'],
  challengeTTL: 5 * 60 * 1000,
});

// ============================================================================
// Token Functions
// ============================================================================

export async function generateTokens(
  userId: string,
  publicKeyId: string,
  sessionId: string
): Promise<TokenPair> {
  const accessToken = await new SignJWT({
    sub: userId,
    type: 'access',
    publicKeyId,
    sessionId,
  } as TokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .sign(JWT_SECRET);

  const refreshToken = await new SignJWT({
    sub: userId,
    type: 'refresh',
    publicKeyId,
    sessionId,
  } as TokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL}s`)
    .sign(JWT_SECRET);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL,
  };
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function generateAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({
    sub: payload.sub,
    type: 'access',
    publicKeyId: payload.publicKeyId,
    sessionId: payload.sessionId,
  } as TokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .sign(JWT_SECRET);
}

export async function generateRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({
    sub: payload.sub,
    type: 'refresh',
    publicKeyId: payload.publicKeyId,
    sessionId: payload.sessionId,
  } as TokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL}s`)
    .sign(JWT_SECRET);
}

// ============================================================================
// Services (single key per user, like self-hosted backend)
// ============================================================================

export function getServices() {
  const stores = getStores();

  const authService = new AuthService({
    config,
    users: stores.users,
    challenges: stores.challenges,
    sessions: stores.sessions,
    generateTokens,
  });

  return { authService, stores };
}

// ============================================================================
// Auth Helpers
// ============================================================================

export async function authenticateRequest(authHeader: string | null): Promise<{
  success: true;
  payload: TokenPayload;
} | {
  success: false;
  error: string;
  message: string;
  status: number;
}> {
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      success: false,
      error: ERROR_CODES.UNAUTHORIZED,
      message: 'Authorization required',
      status: 401,
    };
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token);

  if (!payload) {
    return {
      success: false,
      error: ERROR_CODES.INVALID_TOKEN,
      message: 'Invalid token',
      status: 401,
    };
  }

  if (payload.type !== 'access') {
    return {
      success: false,
      error: ERROR_CODES.INVALID_TOKEN,
      message: 'Invalid token type',
      status: 401,
    };
  }

  const { stores } = getServices();
  const isValid = await stores.sessions.isValid(payload.sessionId);

  if (!isValid) {
    return {
      success: false,
      error: ERROR_CODES.INVALID_TOKEN,
      message: 'Session is invalid or expired',
      status: 401,
    };
  }

  return { success: true, payload };
}

export { ERROR_CODES, ACCESS_TOKEN_TTL };
