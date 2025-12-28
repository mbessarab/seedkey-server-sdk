/**
 * Core types for user and public key representation
 */

/**
 * Public key information
 */
export interface PublicKeyInfo {
  /** Unique key ID */
  id: string;
  /** Public key in base64 */
  publicKey: string;
  /** Device name */
  deviceName?: string;
  /** When the key was added (Unix timestamp in milliseconds) */
  addedAt: number;
  /** When the key was last used (Unix timestamp in milliseconds) */
  lastUsed: number;
}

/**
 * User entity (core fields only)
 * Each user has exactly one public key
 */
export interface User {
  /** Unique user ID */
  id: string;
  /** User's public key */
  publicKey: PublicKeyInfo;
  /** When the user was created (Unix timestamp in milliseconds) */
  createdAt: number;
  /** Last login timestamp (Unix timestamp in milliseconds) */
  lastLogin?: number;
}

/**
 * Metadata for user creation
 */
export interface UserMetadata {
  deviceName?: string;
  extensionVersion?: string;
}

/**
 * Metadata for key addition
 */
export interface KeyMetadata {
  deviceName?: string;
}

