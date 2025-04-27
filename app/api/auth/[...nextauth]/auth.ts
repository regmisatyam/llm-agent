import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Extended types to include additional token properties
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
  }
}

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.modify",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account }) {
      // Save the access token and refresh token in the JWT on the initial login
      if (account) {
        console.log("Account credentials received:", { 
          access_token: account.access_token ? "exists" : "missing",
          expires_at: account.expires_at,
        });
        
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
      }
      
      // If the token has expired, return the existing token for now
      // In a production app, you would use the refresh token to get a new access token
      const now = Date.now();
      if (token.accessTokenExpires && now > token.accessTokenExpires) {
        console.log("Access token has expired");
        // This is where you would refresh the token
      }
      
      return token;
    },
    async session({ session, token }) {
      // Send the access token to the client
      session.accessToken = token.accessToken;
      session.error = token.error;
      
      console.log("Session being created with access token:", token.accessToken ? "exists" : "missing");
      
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
}; 