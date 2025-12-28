/**
 * @seedkey/sdk-server
 * Core library for SeedKey passwordless authentication protocol
 * 
 * This package provides:
 * - Types for authentication protocol
 * - Cryptographic utilities (Ed25519 signature verification)
 * - Core authentication and key management services
 * 
 * Storage adapters and token generation must be provided by the backend.
 */

// Types
export * from './types/index.js';

// Crypto
export * from './crypto/index.js';

// Services
export * from './services/index.js';

