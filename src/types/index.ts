/**
 * Types Index
 */

// Challenge types
export type {
  ChallengeAction,
  Challenge,
  StoredChallenge,
  ChallengeRequest,
  ChallengeResult,
} from './challenge.js';

// User types
export type {
  PublicKeyInfo,
  User,
  UserMetadata,
  KeyMetadata,
} from './user.js';

// Token types
export type {
  TokenType,
  TokenPayload,
  TokenPair,
  Session,
} from './token.js';

// Auth types
export type {
  RegisterRequest,
  VerifyRequest,
  RefreshRequest,
} from './auth.js';

// Error types
export {
  ERROR_CODES,
  SeedKeyError,
} from './errors.js';
export type {
  ErrorCode,
  ErrorResponse,
} from './errors.js';

// Config types
export {
  DEFAULT_CONFIG,
  resolveConfig,
} from './config.js';
export type {
  SeedKeyConfig,
  ResolvedConfig,
} from './config.js';

// Storage interfaces
export type {
  UserStore,
  ChallengeStore,
  SessionStore,
  SeedKeyStores,
} from './storage.js';