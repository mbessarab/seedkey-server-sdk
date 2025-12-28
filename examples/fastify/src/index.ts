/**
 * SeedKey Authentication Example with Fastify
 * 
 * This example implements backend API:
 * - POST /api/v1/seedkey/challenge  - Create auth challenge
 * - POST /api/v1/seedkey/register   - Register new user
 * - POST /api/v1/seedkey/verify     - Verify signature & login
 * - POST /api/v1/seedkey/logout     - Invalidate session
 * - POST /api/v1/seedkey/refresh    - Refresh access token
 * - GET  /api/v1/seedkey/user       - Get current user info
 */

import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import {
  AuthService,
  resolveConfig,
  SeedKeyError,
  ERROR_CODES,
  type TokenPair,
  type TokenPayload,
  type ChallengeRequest,
  type RegisterRequest,
  type VerifyRequest,
} from '@seedkey/sdk-server';
import { createMemoryStores, type SeedKeyStores } from './storage/memory.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// ============================================================================
// Configuration
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const PORT = parseInt(process.env.PORT || '3000');
const ACCESS_TOKEN_TTL = 3600; // 1 hour
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days

const config = resolveConfig({
  allowedDomains: ['localhost', 'example.com'],
  challengeTTL: 5 * 60 * 1000,
});

// ============================================================================
// Plugins
// ============================================================================

await fastify.register(fastifyCors, {
  origin: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

await fastify.register(fastifyJwt, {
  secret: JWT_SECRET,
  sign: { algorithm: 'HS256' },
});

// ============================================================================
// Storage and Services
// ============================================================================

const stores: SeedKeyStores = createMemoryStores();

// Token generation function
const generateTokens = async (
  userId: string,
  publicKeyId: string,
  sessionId: string
): Promise<TokenPair> => {
  const accessToken = fastify.jwt.sign(
    { sub: userId, type: 'access', publicKeyId, sessionId } as TokenPayload,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

  const refreshToken = fastify.jwt.sign(
    { sub: userId, type: 'refresh', publicKeyId, sessionId } as TokenPayload,
    { expiresIn: REFRESH_TOKEN_TTL }
  );

  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL };
};

// Create auth service (single key per user)
const authService = new AuthService({
  config,
  users: stores.users,
  challenges: stores.challenges,
  sessions: stores.sessions,
  generateTokens,
});

// ============================================================================
// Type declarations
// ============================================================================

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenPayload;
    user: TokenPayload;
  }
}

// ============================================================================
// Middleware
// ============================================================================

async function authenticateRequest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();

    const payload = request.user as TokenPayload;

    if (payload.type !== 'access') {
      return reply.status(401).send({ error: ERROR_CODES.INVALID_TOKEN, message: 'Invalid token type' });
    }

    const isValid = await stores.sessions.isValid(payload.sessionId);
    if (!isValid) {
      return reply.status(401).send({ error: ERROR_CODES.INVALID_TOKEN, message: 'Session is invalid or expired' });
    }
  } catch {
    return reply.status(401).send({ error: ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' });
  }
}

function handleError(error: unknown, reply: FastifyReply): FastifyReply {
  if (error instanceof SeedKeyError) {
    return reply.status(error.statusCode).send(error.toJSON());
  }
  console.error('Unexpected error:', error);
  return reply.status(500).send({ error: ERROR_CODES.INTERNAL_ERROR, message: 'An internal error occurred' });
}

// ============================================================================
// Routes
// ============================================================================

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// POST /api/v1/seedkey/challenge
fastify.post<{ Body: ChallengeRequest }>('/api/v1/seedkey/challenge', async (request, reply) => {
  const result = await authService.createChallenge(request.body);

  if (!result.success) {
    const statusCode = result.error === 'USER_NOT_FOUND' ? 404 : result.error === 'USER_EXISTS' ? 409 : 400;
    return reply.status(statusCode).send({ error: result.error, message: result.error, hint: result.hint });
  }

  return reply.status(200).send({ challenge: result.challenge, challengeId: result.challengeId });
});

// POST /api/v1/seedkey/register
fastify.post<{ Body: RegisterRequest }>('/api/v1/seedkey/register', async (request, reply) => {
  try {
    const result = await authService.register(request.body);

    return reply.status(201).send({
      success: true,
      action: 'register',
      user: {
        id: result.user.id,
        publicKey: result.keyInfo.publicKey,
        createdAt: result.user.createdAt.toISOString(),
      },
      token: result.tokens,
    });
  } catch (error) {
    return handleError(error, reply);
  }
});

// POST /api/v1/seedkey/verify
fastify.post<{ Body: VerifyRequest }>('/api/v1/seedkey/verify', async (request, reply) => {
  try {
    const result = await authService.verify(request.body);

    return reply.status(200).send({
      success: true,
      action: 'login',
      user: {
        id: result.user.id,
        publicKey: result.keyInfo.publicKey,
        createdAt: result.user.createdAt.toISOString(),
        lastLogin: result.user.lastLogin?.toISOString() || new Date().toISOString(),
      },
      token: result.tokens,
    });
  } catch (error) {
    return handleError(error, reply);
  }
});

// POST /api/v1/seedkey/logout
fastify.post('/api/v1/seedkey/logout', { preHandler: [authenticateRequest] }, async (request, reply) => {
  const payload = request.user as TokenPayload;
  await stores.sessions.invalidate(payload.sessionId);
  return reply.status(200).send({ success: true, message: 'Logged out successfully' });
});

// POST /api/v1/seedkey/refresh
fastify.post<{ Body: { refreshToken: string } }>('/api/v1/seedkey/refresh', async (request, reply) => {
  const { refreshToken } = request.body;

  if (!refreshToken) {
    return reply.status(400).send({ error: ERROR_CODES.VALIDATION_ERROR, message: 'refreshToken is required' });
  }

  try {
    const payload = fastify.jwt.verify<TokenPayload>(refreshToken);

    if (payload.type !== 'refresh') {
      return reply.status(401).send({ error: ERROR_CODES.INVALID_TOKEN, message: 'Invalid token type' });
    }

    const isValid = await stores.sessions.isValid(payload.sessionId);
    if (!isValid) {
      return reply.status(401).send({ error: ERROR_CODES.INVALID_TOKEN, message: 'Session is invalid or expired' });
    }

    const user = await stores.users.findById(payload.sub);
    if (!user) {
      return reply.status(404).send({ error: ERROR_CODES.USER_NOT_FOUND, message: 'User not found' });
    }

    const accessToken = fastify.jwt.sign(
      { sub: payload.sub, type: 'access', publicKeyId: payload.publicKeyId, sessionId: payload.sessionId } as TokenPayload,
      { expiresIn: ACCESS_TOKEN_TTL }
    );
    const newRefreshToken = fastify.jwt.sign(
      { sub: payload.sub, type: 'refresh', publicKeyId: payload.publicKeyId, sessionId: payload.sessionId } as TokenPayload,
      { expiresIn: REFRESH_TOKEN_TTL }
    );

    return reply.status(200).send({ accessToken, refreshToken: newRefreshToken, expiresIn: ACCESS_TOKEN_TTL });
  } catch {
    return reply.status(401).send({ error: ERROR_CODES.INVALID_TOKEN, message: 'Invalid or expired refresh token' });
  }
});

// GET /api/v1/seedkey/user
fastify.get('/api/v1/seedkey/user', { preHandler: [authenticateRequest] }, async (request, reply) => {
  const payload = request.user as TokenPayload;

  try {
    const user = await authService.getUser(payload.sub);
    if (!user) {
      return reply.status(404).send({ error: ERROR_CODES.USER_NOT_FOUND, message: 'User not found' });
    }

    // Single key per user
    const publicKey = user.publicKey;
    return reply.status(200).send({
      user: {
        id: user.id,
        publicKey: publicKey ? {
          id: publicKey.id,
          publicKey: publicKey.publicKey,
          deviceName: publicKey.deviceName,
          addedAt: publicKey.addedAt.toISOString(),
          lastUsed: publicKey.lastUsed.toISOString(),
        } : null,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return handleError(error, reply);
  }
});

// ============================================================================
// Error Handler
// ============================================================================

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
    return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Authorization header is required' });
  }

  if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
    return reply.status(401).send({ error: 'TOKEN_EXPIRED', message: 'Token has expired' });
  }

  if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
    return reply.status(401).send({ error: 'INVALID_TOKEN', message: 'Invalid token' });
  }

  if (error.validation) {
    return reply.status(400).send({ error: 'VALIDATION_ERROR', message: error.message });
  }

  return reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'An internal error occurred' });
});

// ============================================================================
// Start Server
// ============================================================================

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });

    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🔐 SeedKey Auth Fastify Example                                 ║
║                                                                   ║
║   Server running at: http://localhost:${PORT}                      ║
║                                                                   ║
║   Auth Endpoints:                                                 ║
║   • POST /api/v1/seedkey/challenge  - Create auth challenge       ║
║   • POST /api/v1/seedkey/register   - Register new user           ║
║   • POST /api/v1/seedkey/verify     - Verify signature & login    ║
║   • POST /api/v1/seedkey/logout     - Invalidate session          ║
║   • POST /api/v1/seedkey/refresh    - Refresh access token        ║
║   • GET  /api/v1/seedkey/user       - Get current user info       ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
