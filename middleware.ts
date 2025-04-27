import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // If it's an API route that requires authentication
  if (path.startsWith('/api/email') || path.startsWith('/api/calendar')) {
    console.log(`[Middleware] Checking auth for: ${path}`);
    
    // Make sure NEXTAUTH_SECRET exists
    if (!process.env.NEXTAUTH_SECRET) {
      console.error('[Middleware] NEXTAUTH_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Server misconfiguration - auth secret missing' },
        { status: 500 }
      );
    }

    // Log cookies for debugging
    const cookieHeader = request.headers.get('cookie') || '';
    console.log(`[Middleware] Cookies present: ${cookieHeader ? 'yes' : 'no'}`);
    if (cookieHeader) {
      const cookieNames = cookieHeader.split(';').map(c => c.trim().split('=')[0]);
      console.log(`[Middleware] Cookie names:`, cookieNames);

      // Check for next-auth session cookie
      const hasSessionCookie = cookieNames.some(name => 
        name.startsWith('next-auth.session-token') || 
        name.startsWith('__Secure-next-auth.session-token')
      );
      console.log(`[Middleware] Has session cookie: ${hasSessionCookie}`);
    }

    try {
      // More detailed token debugging
      console.log(`[Middleware] NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'not set'}`);
      
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false,
      });
      
      console.log(`[Middleware] Token found: ${token ? 'yes' : 'no'}`);
      if (token) {
        console.log(`[Middleware] Token has accessToken: ${!!token.accessToken}`);
        console.log(`[Middleware] Token expires: ${token.accessTokenExpires ? new Date(token.accessTokenExpires).toISOString() : 'unknown'}`);
        
        // Check if token is expired
        if (token.accessTokenExpires && Date.now() > token.accessTokenExpires) {
          console.log(`[Middleware] Token is expired`);
          
          // If we got here, NextAuth couldn't refresh the token properly
          // Return an error so the frontend can handle it better
          return NextResponse.json(
            { 
              error: 'Access token expired',
              message: 'Your session has expired. Please sign out and sign in again.' 
            },
            { status: 401 }
          );
        }
      }
      
      if (!token) {
        console.log('[Middleware] Authentication required but no token found');
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      if (!token.accessToken) {
        console.log('[Middleware] Token exists but missing accessToken');
        return NextResponse.json(
          { error: 'Invalid token - no access token' },
          { status: 401 }
        );
      }
      
      // Token looks good, allow the request to proceed
      console.log('[Middleware] Authentication successful');
      
      // Create a new response to pass the request through
      const response = NextResponse.next();
      
      // We could enhance the request with additional headers if needed
      // For now, just pass it through
      return response;
    } catch (error) {
      console.error('[Middleware] Error validating token:', error);
      return NextResponse.json(
        { error: 'Authentication error', details: error instanceof Error ? error.message : String(error) },
        { status: 401 }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/email/:path*', '/api/calendar/:path*'],
}; 