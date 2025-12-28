/**
 * SeedKey Authentication Example with Express.js
 * 
 * This example implements backend API:
 * - POST /api/v1/seedkey/challenge  - Create auth challenge
 * - POST /api/v1/seedkey/register   - Register new user
 * - POST /api/v1/seedkey/verify     - Verify signature & login
 * - POST /api/v1/seedkey/logout     - Invalidate session
 * - POST /api/v1/seedkey/refresh    - Refresh access token
 * - GET  /api/v1/seedkey/user       - Get current user info
 */

import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';
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

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

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
// Storage and Services
// ============================================================================

const stores: SeedKeyStores = createMemoryStores();

// Token generation function
const generateTokens = async (
  userId: string,
  publicKeyId: string,
  sessionId: string
): Promise<TokenPair> => {
  const accessToken = jwt.sign(
    { sub: userId, type: 'access', publicKeyId, sessionId } as TokenPayload,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );

  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh', publicKeyId, sessionId } as TokenPayload,
    JWT_SECRET,
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
// Middleware
// ============================================================================

interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

async function authenticateRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: ERROR_CODES.UNAUTHORIZED, message: 'Authorization required' });
      return;
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

    if (payload.type !== 'access') {
      res.status(401).json({ error: ERROR_CODES.INVALID_TOKEN, message: 'Invalid token type' });
      return;
    }

    const isValid = await stores.sessions.isValid(payload.sessionId);
    if (!isValid) {
      res.status(401).json({ error: ERROR_CODES.INVALID_TOKEN, message: 'Session is invalid or expired' });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: ERROR_CODES.UNAUTHORIZED, message: 'Authentication required' });
  }
}

function handleError(error: unknown, res: Response): void {
  if (error instanceof SeedKeyError) {
    res.status(error.statusCode).json(error.toJSON());
    return;
  }
  console.error('Unexpected error:', error);
  res.status(500).json({ error: ERROR_CODES.INTERNAL_ERROR, message: 'An internal error occurred' });
}

// ============================================================================
// Routes
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/v1/seedkey/challenge
app.post('/api/v1/seedkey/challenge', async (req: Request<{}, {}, ChallengeRequest>, res) => {
  const result = await authService.createChallenge(req.body);

  if (!result.success) {
    const statusCode = result.error === 'USER_NOT_FOUND' ? 404 : result.error === 'USER_EXISTS' ? 409 : 400;
    res.status(statusCode).json({ error: result.error, message: result.error, hint: result.hint });
    return;
  }

  res.json({ challenge: result.challenge, challengeId: result.challengeId });
});

// POST /api/v1/seedkey/register
app.post('/api/v1/seedkey/register', async (req: Request<{}, {}, RegisterRequest>, res) => {
  try {
    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      action: 'register',
      user: {
        id: result.user.id,
        publicKey: result.keyInfo.publicKey,
        createdAt: result.user.createdAt,
      },
      token: result.tokens,
    });
  } catch (error) {
    handleError(error, res);
  }
});

// POST /api/v1/seedkey/verify
app.post('/api/v1/seedkey/verify', async (req: Request<{}, {}, VerifyRequest>, res) => {
  try {
    const result = await authService.verify(req.body);

    res.json({
      success: true,
      action: 'login',
      user: {
        id: result.user.id,
        publicKey: result.keyInfo.publicKey,
        createdAt: result.user.createdAt,
        lastLogin: result.user.lastLogin ?? Date.now(),
      },
      token: result.tokens,
    });
  } catch (error) {
    handleError(error, res);
  }
});

// POST /api/v1/seedkey/logout
app.post('/api/v1/seedkey/logout', authenticateRequest, async (req: AuthenticatedRequest, res) => {
  const payload = req.user!;
  await stores.sessions.invalidate(payload.sessionId);
  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/v1/seedkey/refresh
app.post('/api/v1/seedkey/refresh', async (req: Request<{}, {}, { refreshToken: string }>, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: ERROR_CODES.VALIDATION_ERROR, message: 'refreshToken is required' });
    return;
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET) as TokenPayload;

    if (payload.type !== 'refresh') {
      res.status(401).json({ error: ERROR_CODES.INVALID_TOKEN, message: 'Invalid token type' });
      return;
    }

    const isValid = await stores.sessions.isValid(payload.sessionId);
    if (!isValid) {
      res.status(401).json({ error: ERROR_CODES.INVALID_TOKEN, message: 'Session is invalid or expired' });
      return;
    }

    const user = await stores.users.findById(payload.sub);
    if (!user) {
      res.status(404).json({ error: ERROR_CODES.USER_NOT_FOUND, message: 'User not found' });
      return;
    }

    const accessToken = jwt.sign(
      { sub: payload.sub, type: 'access', publicKeyId: payload.publicKeyId, sessionId: payload.sessionId } as TokenPayload,
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );
    const newRefreshToken = jwt.sign(
      { sub: payload.sub, type: 'refresh', publicKeyId: payload.publicKeyId, sessionId: payload.sessionId } as TokenPayload,
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_TTL }
    );

    res.json({ accessToken, refreshToken: newRefreshToken, expiresIn: ACCESS_TOKEN_TTL });
  } catch {
    res.status(401).json({ error: ERROR_CODES.INVALID_TOKEN, message: 'Invalid or expired refresh token' });
  }
});

// GET /api/v1/seedkey/user
app.get('/api/v1/seedkey/user', authenticateRequest, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await authService.getUser(req.user!.sub);
    if (!user) {
      res.status(404).json({ error: ERROR_CODES.USER_NOT_FOUND, message: 'User not found' });
      return;
    }

    const publicKey = user.publicKey;
    res.json({
      user: {
        id: user.id,
        publicKey: publicKey ? {
          id: publicKey.id,
          publicKey: publicKey.publicKey,
          deviceName: publicKey.deviceName,
          addedAt: publicKey.addedAt,
          lastUsed: publicKey.lastUsed,
        } : null,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    handleError(error, res);
  }
});

// ============================================================================
// Error Handler
// ============================================================================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  handleError(err, res);
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🔐 SeedKey Auth Express Example                                 ║
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
});
