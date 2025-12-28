/**
 * GET /api/v1/auth/me - Get current user info
 * Single key per user (mirrors self-hosted backend)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getServices, ERROR_CODES } from '@/lib/seedkey';
import { SeedKeyError } from '@seedkey/sdk-server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const auth = await authenticateRequest(authHeader);

    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error, message: auth.message },
        { status: auth.status }
      );
    }

    const { authService } = getServices();
    const user = await authService.getUser(auth.payload.sub);

    if (!user) {
      return NextResponse.json(
        { error: ERROR_CODES.USER_NOT_FOUND, message: 'User not found' },
        { status: 404 }
      );
    }

    // Single key per user (like self-hosted backend)
    const publicKey = user.publicKey;

    return NextResponse.json({
      user: {
        id: user.id,
        publicKey: publicKey ? {
          id: publicKey.id,
          publicKey: publicKey.publicKey,
          deviceName: publicKey.deviceName,
          addedAt: new Date(publicKey.addedAt).toISOString(),
          lastUsed: new Date(publicKey.lastUsed).toISOString(),
        } : null,
        createdAt: new Date(user.createdAt).toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof SeedKeyError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }

    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
