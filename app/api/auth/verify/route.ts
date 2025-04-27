import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/auth';
import { getToken } from 'next-auth/jwt';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envStatus = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'not set',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'set' : 'not set',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'set' : 'not set',
      NODE_ENV: process.env.NODE_ENV || 'development'
    };
    
    // Check cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const cookieNames = cookieHeader ? cookieHeader.split(';').map(c => c.trim().split('=')[0]) : [];
    
    // Try to get the session
    const session = await getServerSession(authOptions);
    
    // Try to get the token directly
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    return NextResponse.json({
      status: 'Auth Verification',
      session: {
        exists: !!session,
        hasAccessToken: !!session?.accessToken,
        user: session?.user ? {
          name: session.user.name,
          email: session.user.email
        } : null
      },
      token: {
        exists: !!token,
        hasAccessToken: !!token?.accessToken,
        expiresAt: token?.accessTokenExpires ? new Date(token.accessTokenExpires).toISOString() : null,
        isExpired: token?.accessTokenExpires ? Date.now() > token.accessTokenExpires : null
      },
      cookies: {
        count: cookieNames.length,
        names: cookieNames,
        hasSessionCookie: cookieNames.some(name => 
          name.startsWith('next-auth.session-token') || 
          name.startsWith('__Secure-next-auth.session-token')
        )
      },
      environment: envStatus,
      request: {
        host: request.headers.get('host') || 'unknown',
        url: request.url
      }
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json({
      error: 'Failed to verify auth state',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 