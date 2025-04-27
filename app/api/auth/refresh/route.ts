import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { refreshGoogleAccessToken } from '@/utils/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.NEXTAUTH_SECRET) {
      console.error('NEXTAUTH_SECRET not set');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // Get current token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('[Token Refresh] Current token expires at:', token.accessTokenExpires ? new Date(token.accessTokenExpires).toISOString() : 'unknown');
    console.log('[Token Refresh] Has refresh token:', !!token.refreshToken);

    // Force refresh the token regardless of expiration
    const refreshedToken = await refreshGoogleAccessToken(token);

    if (refreshedToken.error) {
      console.error('[Token Refresh] Failed to refresh token:', refreshedToken.error);
      return NextResponse.json({ 
        error: 'Failed to refresh token',
        details: refreshedToken.error
      }, { status: 500 });
    }

    // Return success with new expiration time
    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      expires: refreshedToken.accessTokenExpires ? new Date(refreshedToken.accessTokenExpires).toISOString() : null
    });
  } catch (error) {
    console.error('[Token Refresh] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to refresh token',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 