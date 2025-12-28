import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '@/lib/seedkey';
import { SeedKeyError, type VerifyRequest } from '@seedkey/sdk-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as VerifyRequest;
    const { authService } = getServices();

    const result = await authService.verify(body);

    return NextResponse.json({
      success: true,
      action: 'login',
      user: {
        id: result.user.id,
        publicKey: result.keyInfo.publicKey,
        createdAt: new Date(result.user.createdAt).toISOString(),
        lastLogin: result.user.lastLogin ? new Date(result.user.lastLogin).toISOString() : new Date().toISOString(),
      },
      token: result.tokens,
    });
  } catch (error) {
    if (error instanceof SeedKeyError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }

    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
