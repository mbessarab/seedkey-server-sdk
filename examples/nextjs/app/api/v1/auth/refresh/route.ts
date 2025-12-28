import { NextRequest, NextResponse } from 'next/server';
import {
  verifyToken,
  generateAccessToken,
  generateRefreshToken,
  getServices,
  ERROR_CODES,
  ACCESS_TOKEN_TTL,
} from '@/lib/seedkey';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: ERROR_CODES.VALIDATION_ERROR, message: 'refreshToken is required' },
        { status: 400 }
      );
    }

    const payload = await verifyToken(refreshToken);

    if (!payload) {
      return NextResponse.json(
        { error: ERROR_CODES.INVALID_TOKEN, message: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    if (payload.type !== 'refresh') {
      return NextResponse.json(
        { error: ERROR_CODES.INVALID_TOKEN, message: 'Invalid token type' },
        { status: 401 }
      );
    }

    const { stores } = getServices();
    const isValid = await stores.sessions.isValid(payload.sessionId);

    if (!isValid) {
      return NextResponse.json(
        { error: ERROR_CODES.INVALID_TOKEN, message: 'Session is invalid or expired' },
        { status: 401 }
      );
    }

    const user = await stores.users.findById(payload.sub);
    if (!user) {
      return NextResponse.json(
        { error: ERROR_CODES.USER_NOT_FOUND, message: 'User not found' },
        { status: 404 }
      );
    }

    const accessToken = await generateAccessToken(payload);
    const newRefreshToken = await generateRefreshToken(payload);

    return NextResponse.json({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: ACCESS_TOKEN_TTL,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

