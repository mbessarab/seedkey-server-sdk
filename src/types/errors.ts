/**
 * Error Types
 * Core protocol error codes and error class
 */

/**
 * Core protocol error codes
 */
export const ERROR_CODES = {
  // User errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_EXISTS: 'USER_EXISTS',

  // Challenge errors
  CHALLENGE_EXPIRED: 'CHALLENGE_EXPIRED',
  CHALLENGE_NOT_FOUND: 'CHALLENGE_NOT_FOUND',
  NONCE_REUSED: 'NONCE_REUSED',
  INVALID_CHALLENGE: 'INVALID_CHALLENGE',

  // Auth errors
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',

  // Key errors
  KEY_NOT_FOUND: 'KEY_NOT_FOUND',
  KEY_EXISTS: 'KEY_EXISTS',
  CANNOT_DELETE_LAST_KEY: 'CANNOT_DELETE_LAST_KEY',

  // General errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  message: string;
  hint?: string;
}

/**
 * Error class
 */
export class SeedKeyError extends Error {
  public readonly code: ErrorCode;
  public readonly hint?: string;
  public readonly statusCode: number;

  constructor(code: ErrorCode, message: string, statusCode: number = 400, hint?: string) {
    super(message);
    this.name = 'SeedKeyError';
    this.code = code;
    this.hint = hint;
    this.statusCode = statusCode;
  }

  toJSON(): ErrorResponse {
    return {
      error: this.code,
      message: this.message,
      ...(this.hint && { hint: this.hint }),
    };
  }
}

