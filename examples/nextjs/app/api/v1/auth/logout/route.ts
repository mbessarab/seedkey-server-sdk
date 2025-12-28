import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getServices } from '@/lib/seedkey';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const auth = await authenticateRequest(authHeader);

    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error, message: auth.message },
        { status: auth.status }
      );
    }

    const { stores } = getServices();
    await stores.sessions.invalidate(auth.payload.sessionId);

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

