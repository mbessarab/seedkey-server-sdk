/**
 * Services Index
 * Core protocol services
 */

export { AuthService } from './auth.service.js';
export type {
  AuthServiceDeps,
  RegisterResult,
  VerifyResult,
  UserStoreAdapter,
  ChallengeStoreAdapter,
  SessionStoreAdapter,
  TokenGenerator,
} from './auth.service.js';
