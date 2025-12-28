import { describe, it, expect } from 'vitest';
import { SeedKeyError, ERROR_CODES } from '../../src/types/errors';

describe('SeedKeyError', () => {
  it('should create error with code and message', () => {
    const error = new SeedKeyError('USER_NOT_FOUND', 'User not found');

    expect(error.code).toBe('USER_NOT_FOUND');
    expect(error.message).toBe('User not found');
    expect(error.statusCode).toBe(400); // default
    expect(error.hint).toBeUndefined();
    expect(error.name).toBe('SeedKeyError');
  });

  it('should create error with custom status code', () => {
    const error = new SeedKeyError('UNAUTHORIZED', 'Not authorized', 401);

    expect(error.statusCode).toBe(401);
  });

  it('should create error with hint', () => {
    const error = new SeedKeyError('USER_NOT_FOUND', 'User not found', 404, 'register');

    expect(error.hint).toBe('register');
  });

  it('should serialize to JSON without hint when not provided', () => {
    const error = new SeedKeyError('INVALID_SIGNATURE', 'Bad signature', 401);
    const json = error.toJSON();

    expect(json).toEqual({
      error: 'INVALID_SIGNATURE',
      message: 'Bad signature',
    });
    expect(json).not.toHaveProperty('hint');
  });

  it('should serialize to JSON with hint when provided', () => {
    const error = new SeedKeyError('USER_NOT_FOUND', 'User not found', 404, 'register');
    const json = error.toJSON();

    expect(json).toEqual({
      error: 'USER_NOT_FOUND',
      message: 'User not found',
      hint: 'register',
    });
  });

  it('should be instanceof Error', () => {
    const error = new SeedKeyError('INTERNAL_ERROR', 'Something went wrong', 500);
    expect(error instanceof Error).toBe(true);
    expect(error instanceof SeedKeyError).toBe(true);
  });
});

describe('ERROR_CODES', () => {
  it('should have all expected error codes', () => {
    expect(ERROR_CODES.USER_NOT_FOUND).toBe('USER_NOT_FOUND');
    expect(ERROR_CODES.USER_EXISTS).toBe('USER_EXISTS');
    expect(ERROR_CODES.CHALLENGE_EXPIRED).toBe('CHALLENGE_EXPIRED');
    expect(ERROR_CODES.CHALLENGE_NOT_FOUND).toBe('CHALLENGE_NOT_FOUND');
    expect(ERROR_CODES.NONCE_REUSED).toBe('NONCE_REUSED');
    expect(ERROR_CODES.INVALID_CHALLENGE).toBe('INVALID_CHALLENGE');
    expect(ERROR_CODES.INVALID_SIGNATURE).toBe('INVALID_SIGNATURE');
    expect(ERROR_CODES.INVALID_TOKEN).toBe('INVALID_TOKEN');
    expect(ERROR_CODES.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
    expect(ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ERROR_CODES.KEY_NOT_FOUND).toBe('KEY_NOT_FOUND');
    expect(ERROR_CODES.KEY_EXISTS).toBe('KEY_EXISTS');
    expect(ERROR_CODES.CANNOT_DELETE_LAST_KEY).toBe('CANNOT_DELETE_LAST_KEY');
    expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
  });
});

