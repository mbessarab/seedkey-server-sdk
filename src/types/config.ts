/**
 * Configuration Types
 */

/**
 * core configuration
 */
export interface SeedKeyConfig {
  /** Allowed domains for challenge validation */
  allowedDomains: string[];

  /** Challenge TTL in milliseconds (default: 300000 = 5 minutes) */
  challengeTTL?: number;

  /** Current domain for challenge creation */
  currentDomain?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  challengeTTL: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Resolved configuration with defaults applied
 */
export interface ResolvedConfig {
  allowedDomains: string[];
  challengeTTL: number;
  currentDomain: string;
}

/**
 * Resolve configuration with defaults
 */
export function resolveConfig(config: SeedKeyConfig): ResolvedConfig {
  return {
    allowedDomains: config.allowedDomains,
    challengeTTL: config.challengeTTL ?? DEFAULT_CONFIG.challengeTTL,
    currentDomain: config.currentDomain ?? config.allowedDomains[0],
  };
}

