# SeedKey Server SDK

![license](https://img.shields.io/badge/license-MIT-blue)

SeedKey Server SDK — это серверная библиотека для беспарольной аутентификации, которая является частью Open Source экосистемы SeedKey. 

## Содержание

- [🧩 Возможности](#возможности)
- [📦 Установка](#установка)
- [🚀 Быстрый старт](#быстрый-старт)
- [🔧 Методы `AuthService`](#методы-authservice)
- [🔌 Хелперы для интеграции](#хелперы-для-интеграции)
- [🤝 Контрибьютинг](#контрибьютинг)
- [🛡️ Раскрытие уязвимостей](#раскрытие-уязвимостей)
- [📄 Лицензия](#лицензия)

## 🧩 Возможности

SDK предоставляет инструменты для удобной аутентификации в вашем сервисе:

- ✅ **Типы протокола** — интерфейсы `Challenge`, `User`, `TokenPayload`, `TokenPair`, ошибки и т.д.
- ✅ **Криптографические утилиты** — верификация подписи Ed25519.
- ✅ **Сервисы аутентификации** — `AuthService` и `KeyService`.
- ✅ **Абстракции хранилищ** — интерфейсы для интеграции с вашей БД.

## 📦 Установка

```bash
npm install @seedkey/sdk-server
yarn add @seedkey/sdk-server
pnpm add @seedkey/sdk-server
```

## 🚀 Быстрый старт

### 1) Опишите конфиг

```ts
import { resolveConfig } from '@seedkey/sdk-server';

export const config = resolveConfig({
  // Challenge валидируется по списку разрешённых доменов
  allowedDomains: ['localhost', 'example.com'],
});
```

### 2) Реализуйте хранилища и генератор токенов

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

  // Опционально
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

### 3) Создайте `AuthService` и подключите эндпоинты

```ts
const authService = new AuthService({
  config,
  users: userStore,
  challenges: challengeStore,
  sessions: sessionStore,
  generateTokens,
});
```

Рекомендованный список API:

- `POST /api/v1/seedkey/challenge`
  - **Body**: `ChallengeRequest` → `{ publicKey: string, action: 'register' | 'authenticate' }`
  - **200**: `{ challenge, challengeId }`
  - **4xx**: `{ error, message, hint? }` (например `USER_NOT_FOUND` / `USER_EXISTS`)
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
  - Инвалидация access token
- `GET /api/v1/seedkey/user`
  - **Header**: `Authorization: Bearer <token>`
  - Текущий пользователь

## 🔧 Методы `AuthService`

`AuthService` — основная бизнес-логика протокола.

Методы:

- `createChallenge(request: ChallengeRequest): Promise<ChallengeResult>`
  - Для `action='authenticate'` вернёт `USER_NOT_FOUND`, если ключ ещё не зарегистрирован.
  - Для `action='register'` вернёт `USER_EXISTS`, если ключ уже зарегистрирован.
- `register(request: RegisterRequest): Promise<RegisterResult>`
  - Проверяет домен/TTL, одноразовость `nonce` и подпись Ed25519.
  - Создаёт пользователя, сессию и токены.
- `verify(request: VerifyRequest): Promise<VerifyResult>`
  - Проверяет, что `challengeId` существует и не использован; валидирует `challenge` и подпись.
  - Помечает `challenge` использованным.
- `getUser(userId: string): Promise<User | null>`
  - Возвращает пользователя.

Коды ошибок:

```ts
const ERROR_CODES = {
  // Ошибки пользователя
  USER_NOT_FOUND: 'USER_NOT_FOUND', // Пользователь не найден (hint: 'register')
  USER_EXISTS: 'USER_EXISTS', // Пользователь уже существует (hint: 'authenticate')

  // Ошибки challenge
  CHALLENGE_EXPIRED: 'CHALLENGE_EXPIRED', // Challenge истёк
  CHALLENGE_NOT_FOUND: 'CHALLENGE_NOT_FOUND', // Challenge не найден
  NONCE_REUSED: 'NONCE_REUSED', // Nonce уже использовался
  INVALID_CHALLENGE: 'INVALID_CHALLENGE', // Некорректный challenge

  // Ошибки аутентификации
  INVALID_SIGNATURE: 'INVALID_SIGNATURE', // Подпись некорректна
  INVALID_TOKEN: 'INVALID_TOKEN', // Токен некорректен
  TOKEN_EXPIRED: 'TOKEN_EXPIRED', // Токен истёк
  UNAUTHORIZED: 'UNAUTHORIZED', // Не авторизован

  // Ошибки ключей
  KEY_NOT_FOUND: 'KEY_NOT_FOUND', // Ключ не найден
  KEY_EXISTS: 'KEY_EXISTS', // Ключ уже существует
  CANNOT_DELETE_LAST_KEY: 'CANNOT_DELETE_LAST_KEY', // Нельзя удалить последний ключ

  // Общие ошибки
  VALIDATION_ERROR: 'VALIDATION_ERROR', // Ошибка валидации
  INTERNAL_ERROR: 'INTERNAL_ERROR', // Внутренняя ошибка
} as const;
```

В папке `examples` можно найти готовые примеры интеграции на Express.js, Next.js и Fastify.

## 🔌 Хелперы для интеграции

Для эффективной интеграции с вашим бэкендом:

- используйте `seedkey-auth-service-migrations` — Liquibase-миграции с описанием необходимых сущностей в БД PostgreSQL;
- сконцентрируйтесь на своей бизнес-логике и разверните self-hosted сервис `seedkey-auth-service`, перенаправляя запросы на аутентификацию в него;
- или отдайте разворачивание `seedkey-auth-service` + `seedkey-auth-service-migrations` Helm-чарту `seedkey-auth-service-helm-chart`.

### 🔧 Связные проекты
Ознакомьтесь также с другими репозиториями экосистемы:
- [seedkey-browser-extension](https://github.com/mbessarab/seedkey-browser-extension) — браузерное расширение.
- [seedkey-db-migrations](https://github.com/mbessarab/seedkey-db-migrations) — миграции для `seedkey-auth-service`.
- [seedkey-auth-service](https://github.com/mbessarab/seedkey-auth-service) — self-hosted сервис аутентификации.
- [seedkey-client-sdk](https://github.com/mbessarab/seedkey-client-sdk) — клиентская библиотека для работы с расширением.
- [seedkey-auth-service-helm-chart](https://github.com/mbessarab/seedkey-auth-service-helm-chart) — Helm Chart для развёртывания `seedkey-auth-service` + миграций.

## 🤝 Контрибьютинг

Если у вас есть идеи и желание сделать вклад в развитие, смело открывайте issue или pull request.

## 🛡️ Раскрытие уязвимостей

Пожалуйста, **не публикуйте** уязвимости в публичных issue.
Сообщайте приватно через контакт `maks@besssarab.ru`
или заведите приватный security advisory в GitHub.

## 📄 Лицензия

См. `LICENSE`.
