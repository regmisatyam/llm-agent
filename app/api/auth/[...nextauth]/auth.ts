import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { refreshGoogleAccessToken } from "@/utils/auth-helpers";

// Extended types to include additional token properties
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    user?: any;
  }
}

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
    user?: any;
  }
}

// Determine if we're in a production environment
const isProduction = process.env.NODE_ENV === "production";
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || (isProduction ? undefined : "http://localhost:3000");

console.log("[NextAuth] Environment:", process.env.NODE_ENV);
console.log("[NextAuth] URL:", NEXTAUTH_URL);
console.log("[NextAuth] Secret exists:", !!process.env.NEXTAUTH_SECRET);
console.log("[NextAuth] Google credentials exist:", !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET);

// Configure Google scopes for proper API access
const googleScopes = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose'
].join(' ');

console.log("[NextAuth] Using scopes:", googleScopes);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: googleScopes,
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Custom pages to bypass NextAuth's default pages
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
  },
  cookies: {
    sessionToken: {
      name: `${isProduction && NEXTAUTH_URL?.startsWith('https://') ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction && NEXTAUTH_URL?.startsWith('https://') || false,
        domain: isProduction ? ".satym.me" : undefined, // Use base domain in production
      },
    },
    callbackUrl: {
      name: `${isProduction && NEXTAUTH_URL?.startsWith('https://') ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction && NEXTAUTH_URL?.startsWith('https://') || false,
        domain: isProduction ? ".satym.me" : undefined,
      },
    },
    csrfToken: {
      name: `${isProduction && NEXTAUTH_URL?.startsWith('https://') ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        // httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction && NEXTAUTH_URL?.startsWith('https://') || false,
      },
    },
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // Initialize on first sign in
      if (account && user) {
        console.log("[NextAuth] Account credentials received:", { 
          access_token: account.access_token ? "exists" : "missing",
          refresh_token: account.refresh_token ? "exists" : "missing",
          expires_at: account.expires_at,
          provider: account.provider,
          type: account.type,
        });
        
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
          user,
        };
      }
      
      // Return previous token if the access token has not expired yet
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }
      
      // Access token has expired, try to refresh it
      console.log("[NextAuth] Access token has expired. Attempting to refresh token");
      
      try {
        const refreshedToken = await refreshGoogleAccessToken(token);
        console.log("[NextAuth] Token refresh result:", 
          refreshedToken.error ? `Error: ${refreshedToken.error}` : "Success");
        
        return refreshedToken;
      } catch (error) {
        console.error("[NextAuth] Error refreshing token:", error);
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }
    },
    async session({ session, token }) {
      // Send the access token to the client
      if (token) {
        session.accessToken = token.accessToken;
        session.error = token.error;
        
        // Add user info to session
        if (token.user) {
          session.user = token.user;
        }
      }
      
      console.log("[NextAuth] Session being created with access token:", token.accessToken ? "exists" : "missing");
      console.log("[NextAuth] Session has error:", token.error || "none");
      
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
}; 