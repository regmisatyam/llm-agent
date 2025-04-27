import { JWT } from 'next-auth/jwt';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Helper to refresh Google's access token
export async function refreshGoogleAccessToken(token: JWT): Promise<JWT> {
  try {
    // If no refresh token, cannot refresh
    if (!token.refreshToken) {
      console.error('[Token Refresh] No refresh token available');
      return {
        ...token,
        error: 'No refresh token available',
      };
    }

    console.log('[Token Refresh] Attempting to refresh token with Google OAuth API');
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/auth/callback/google` : undefined
    );

    // Set credentials with the refresh token
    oauth2Client.setCredentials({
      refresh_token: token.refreshToken
    });

    // Log client configuration for debugging
    console.log('[Token Refresh] OAuth client configured with:', {
      clientId: process.env.GOOGLE_CLIENT_ID ? 'set (truncated)' : 'missing',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'set (truncated)' : 'missing',
      redirectUri: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/auth/callback/google` : 'missing',
    });

    // Attempt to refresh the token directly
    try {
      console.log('[Token Refresh] Calling refreshAccessToken...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      console.log('[Token Refresh] Refresh successful, new expiry:', 
        credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'unknown');
      
      // Return updated token
      return {
        ...token,
        accessToken: credentials.access_token || undefined,
        // Use either the returned expiry or calculate from expires_in
        accessTokenExpires: credentials.expiry_date || 
          (Date.now() + ((credentials as any).expires_in ? (credentials as any).expires_in * 1000 : 3600 * 1000)),
        // Keep the refresh token if a new one wasn't issued
        refreshToken: credentials.refresh_token || token.refreshToken,
        error: undefined,
      };
    } catch (refreshError) {
      console.error('[Token Refresh] Error during OAuth refresh:', refreshError);
      
      // Try an alternative refresh method if the normal one fails
      return await manualRefreshToken(token);
    }
  } catch (error) {
    console.error('[Token Refresh] Error refreshing access token:', error);
    
    return {
      ...token,
      error: `Error refreshing token: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Alternative refresh method that manually calls Google's token endpoint
async function manualRefreshToken(token: JWT): Promise<JWT> {
  try {
    console.log('[Token Refresh] Attempting manual token refresh...');
    
    const url = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: token.refreshToken || '',
      grant_type: 'refresh_token',
    });
    
    // Make the refresh token request manually
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('[Token Refresh] Manual refresh failed:', response.status, errorData);
      throw new Error(`Manual token refresh failed: ${response.status} ${errorData}`);
    }
    
    const data = await response.json();
    console.log('[Token Refresh] Manual refresh successful');
    
    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + (data.expires_in * 1000),
      refreshToken: data.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error('[Token Refresh] Manual refresh error:', error);
    return {
      ...token,
      error: `Manual refresh failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Function to check if a token is expired
export function isTokenExpired(token: JWT | null): boolean {
  if (!token?.accessTokenExpires) return true;
  return Date.now() > token.accessTokenExpires;
}

// Function to get cookie debugging info
export function getCookieDebugInfo(cookieHeader: string | null): {
  count: number;
  names: string[];
  hasSessionCookie: boolean;
} {
  if (!cookieHeader) {
    return { count: 0, names: [], hasSessionCookie: false };
  }
  
  const cookieNames = cookieHeader.split(';').map(c => c.trim().split('=')[0]);
  
  return {
    count: cookieNames.length,
    names: cookieNames,
    hasSessionCookie: cookieNames.some(name => 
      name.startsWith('next-auth.session-token') || 
      name.startsWith('__Secure-next-auth.session-token')
    )
  };
} 