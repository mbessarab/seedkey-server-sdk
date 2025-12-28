import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '@/lib/seedkey';
import { SeedKeyError, type RegisterRequest } from '@seedkey/sdk-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RegisterRequest;
    const { authService } = getServices();

    const result = await authService.register(body);

    return NextResponse.json(
      {
        success: true,
        action: 'register',
        user: {
          id: result.user.id,
          publicKey: result.keyInfo.publicKey,
          createdAt: new Date(result.user.createdAt).toISOString(),
        },
        token: result.tokens,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SeedKeyError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
