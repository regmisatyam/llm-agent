import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // If it's an API route that requires authentication
  if (path.startsWith('/api/email') || path.startsWith('/api/calendar')) {
    console.log(`Middleware checking auth for: ${path}`);
    
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });
    
    console.log(`Token found: ${token ? 'yes' : 'no'}`);
    console.log(`Token has accessToken: ${token?.accessToken ? 'yes' : 'no'}`);
    
    if (!token) {
      console.log('Authentication required but no token found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/email/:path*', '/api/calendar/:path*'],
}; 