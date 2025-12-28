/**
 * Auth Request/Response
 */

import type { Challenge } from './challenge.js';
import type { UserMetadata } from './user.js';

// Register

export interface RegisterRequest {
  publicKey: string;
  challenge: Challenge;
  signature: string;
  metadata?: UserMetadata;
}

// Verify (login)

export interface VerifyRequest {
  challengeId: string;
  challenge: Challenge;
  signature: string;
  publicKey: string;
}

// Refresh

export interface RefreshRequest {
  refreshToken: string;
}

