# SeedKey Server SDK

![license](https://img.shields.io/badge/license-MIT-blue)

SeedKey Server SDK is a server-side library for passwordless authentication, and is part of the SeedKey open-source ecosystem.

## Table of Contents

- [🧩 Features](#features)
- [📦 Installation](#installation)
- [🚀 Quick start](#quick-start)
- [🔧 `AuthService` methods](#authservice-methods)
- [🔌 Integration helpers](#integration-helpers)
- [🤝 Contributing](#contributing)
- [🛡️ Vulnerability disclosure](#vulnerability-disclosure)
- [📄 License](#license)

## 🧩 Features

The SDK provides tools to implement authentication in your service:

- ✅ **Protocol types** — interfaces like `Challenge`, `User`, `TokenPayload`, `TokenPair`, errors, etc.
- ✅ **Cryptographic utilities** — Ed25519 signature verification.
- ✅ **Authentication services** — `AuthService` and `KeyService`.
- ✅ **Storage abstractions** — interfaces to integrate with your DB.

## 📦 Installation

```bash
npm install @seedkey/sdk-server
yarn add @seedkey/sdk-server
pnpm add @seedkey/sdk-server
```

## 🚀 Quick start

### 1) Define the config

```ts
import { resolveConfig } from '@seedkey/sdk-server';

export const config = resolveConfig({
  // The challenge is validated against the list of allowed domains
  allowedDomains: ['localhost', 'example.com'],
});
```

### 2) Implement storage adapters and a token generator

```ts
import type { StoredChallenge, TokenPair, User } from '@seedkey/sdk-server';

export interface UserStore {
  findById(id: string): Promise<User | null>;
  findByPublicKey(publicKey: string): Promise<User | null>;
  create(
    publicKey: string,
    metadata?: { deviceName?: string; extensionVersion?: string }
  ): Promise<User>;
  updateLastLogin(userId: string, publicKey: string): Promise<void>;
  publicKeyExists(publicKey: string): Promise<boolean>;
}

export interface ChallengeStore {
  save(challenge: StoredChallenge): Promise<void>;
  findById(id: string): Promise<StoredChallenge | null>;
  isNonceUsed(nonce: string): Promise<boolean>;

  // Optional
  markAsUsed(id: string): Promise<boolean>;
}

export interface SessionStore {
  create(
    userId: string,
    publicKeyId: string,
    expiresInSeconds?: number
  ): Promise<{ id: string }>;
}

export type TokenGenerator = (
  userId: string,
  publicKeyId: string,
  sessionId: string
) => Promise<TokenPair>;
```

### 3) Create `AuthService` and wire up the endpoints

```ts
const authService = new AuthService({
  config,
  users: userStore,
  challenges: challengeStore,
  sessions: sessionStore,
  generateTokens,
});
```

Recommended API list:

- `POST /api/v1/seedkey/challenge`
  - **Body**: `ChallengeRequest` → `{ publicKey: string, action: 'register' | 'authenticate' }`
  - **200**: `{ challenge, challengeId }`
  - **4xx**: `{ error, message, hint? }` (e.g. `USER_NOT_FOUND` / `USER_EXISTS`)
- `POST /api/v1/seedkey/register`
  - **Body**: `RegisterRequest` → `{ publicKey, challenge, signature, metadata? }`
  - **201**: `{ success: true, action: 'register', user, token }`
- `POST /api/v1/seedkey/verify`
  - **Body**: `VerifyRequest` → `{ challengeId, publicKey, challenge, signature }`
  - **200**: `{ success: true, action: 'login', user, token }`
- `POST /api/v1/seedkey/refresh`
  - **Body**: `{ refreshToken: string }`
  - **200**: `TokenPair`
- `POST /api/v1/seedkey/logout`
  - **Header**: `Authorization: Bearer <token>`
  - Access token invalidation
- `GET /api/v1/seedkey/user`
  - **Header**: `Authorization: Bearer <token>`
  - Current user

## 🔧 `AuthService` methods

`AuthService` is the core business logic of the protocol.

Methods:

- `createChallenge(request: ChallengeRequest): Promise<ChallengeResult>`
  - For `action='authenticate'`, returns `USER_NOT_FOUND` if the key is not registered yet.
  - For `action='register'`, returns `USER_EXISTS` if the key is already registered.
- `register(request: RegisterRequest): Promise<RegisterResult>`
  - Validates the domain/TTL, nonce one-time use, and the Ed25519 signature.
  - Creates a user, session, and tokens.
- `verify(request: VerifyRequest): Promise<VerifyResult>`
  - Checks that `challengeId` exists and is not used; validates the `challenge` and signature.
  - Marks the `challenge` as used.
- `getUser(userId: string): Promise<User | null>`
  - Returns the user.

Error codes:

```ts
const ERROR_CODES = {
  // User errors
  USER_NOT_FOUND: 'USER_NOT_FOUND', // User not found (hint: 'register')
  USER_EXISTS: 'USER_EXISTS', // User already exists (hint: 'authenticate')

  // Challenge errors
  CHALLENGE_EXPIRED: 'CHALLENGE_EXPIRED', // Challenge expired
  CHALLENGE_NOT_FOUND: 'CHALLENGE_NOT_FOUND', // Challenge not found
  NONCE_REUSED: 'NONCE_REUSED', // Nonce has already been used
  INVALID_CHALLENGE: 'INVALID_CHALLENGE', // Invalid challenge

  // Authentication errors
  INVALID_SIGNATURE: 'INVALID_SIGNATURE', // Invalid signature
  INVALID_TOKEN: 'INVALID_TOKEN', // Invalid token
  TOKEN_EXPIRED: 'TOKEN_EXPIRED', // Token expired
  UNAUTHORIZED: 'UNAUTHORIZED', // Unauthorized

  // Key errors
  KEY_NOT_FOUND: 'KEY_NOT_FOUND', // Key not found
  KEY_EXISTS: 'KEY_EXISTS', // Key already exists
  CANNOT_DELETE_LAST_KEY: 'CANNOT_DELETE_LAST_KEY', // Cannot delete the last key

  // Common errors
  VALIDATION_ERROR: 'VALIDATION_ERROR', // Validation error
  INTERNAL_ERROR: 'INTERNAL_ERROR', // Internal error
} as const;
```

In the `examples` folder you can find ready-to-use integration examples for Express.js, Next.js, and Fastify.

## 🔌 Integration helpers

For effective integration with your backend:

- use `seedkey-auth-service-migrations` — Liquibase migrations describing the required entities in a PostgreSQL database;
- focus on your business logic and deploy the self-hosted `seedkey-auth-service`, forwarding authentication requests to it;
- or delegate the deployment of `seedkey-auth-service` + `seedkey-auth-service-migrations` to the Helm chart `seedkey-auth-service-helm-chart`.

### 🔧 Related Projects
Also check out other repositories in the ecosystem:
- [seedkey-browser-extension](https://github.com/mbessarab/seedkey-browser-extension) — browser extension.
- [seedkey-db-migrations](https://github.com/mbessarab/seedkey-db-migrations) — migrations for `seedkey-auth-service`.
- [seedkey-auth-service](https://github.com/mbessarab/seedkey-auth-service) — self-hosted authentication service.
- [seedkey-client-sdk](https://github.com/mbessarab/seedkey-client-sdk) — client library for working with the extension.
- [seedkey-auth-service-helm-chart](https://github.com/mbessarab/seedkey-auth-service-helm-chart) — Helm chart for deploying `seedkey-auth-service` + migrations.

## 🤝 Contributing

If you have ideas and want to contribute, feel free to open an issue or a pull request.

## 🛡️ Vulnerability disclosure

Please, **do not publish** vulnerabilities in public issues.
Report them privately via `maks@besssarab.ru`
or create a private security advisory on GitHub.

## 📄 License

See `LICENSE`.
