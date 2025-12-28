import { NextRequest, NextResponse } from 'next/server';
import { getServices } from '@/lib/seedkey';
import type { ChallengeRequest } from '@seedkey/sdk-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChallengeRequest;
    const { authService } = getServices();

    const result = await authService.createChallenge(body);

    if (!result.success) {
      const statusCode = result.error === 'USER_NOT_FOUND' ? 404 : result.error === 'USER_EXISTS' ? 409 : 400;
      return NextResponse.json(
        { error: result.error, message: result.error, hint: result.hint },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      challenge: result.challenge,
      challengeId: result.challengeId,
    });
  } catch (error) {
    console.error('Challenge creation error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
