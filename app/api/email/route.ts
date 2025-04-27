import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/auth';
import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { refreshGoogleAccessToken } from '@/utils/auth-helpers';
import { getToken } from 'next-auth/jwt';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Helper function to get authenticated Google API client
async function getGoogleClient(token: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || '',
    process.env.GOOGLE_CLIENT_SECRET || ''
  );
  auth.setCredentials({ access_token: token });
  return {
    gmail: google.gmail({ version: 'v1', auth }),
  };
}

// GET handler for fetching emails
export async function GET(request: NextRequest) {
  try {
    // Make sure NextAuth Secret is set
    if (!process.env.NEXTAUTH_SECRET) {
      console.error('[Email API] NEXTAUTH_SECRET not set in environment');
      return NextResponse.json({ error: 'Server misconfiguration - auth secret missing' }, { status: 500 });
    }
    
    // Try to get both token and session
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    const session = await getServerSession(authOptions);
    
    console.log('[Email API] Session exists:', !!session);
    console.log('[Email API] Session has token:', !!session?.accessToken);
    console.log('[Email API] Direct token exists:', !!token);
    console.log('[Email API] Token has access token:', !!token?.accessToken);
    
    // Determine which access token to use
    let accessToken = session?.accessToken || token?.accessToken;
    
    if (!accessToken) {
      console.log('[Email API] No access token available. Attempting to refresh...');
      
      // Try to refresh the token if we have it
      if (token && token.refreshToken) {
        const refreshedToken = await refreshGoogleAccessToken(token);
        if (!refreshedToken.error && refreshedToken.accessToken) {
          console.log('[Email API] Successfully refreshed token');
          accessToken = refreshedToken.accessToken;
        } else {
          console.error('[Email API] Failed to refresh token:', refreshedToken.error);
        }
      }
      
      if (!accessToken) {
        return NextResponse.json({ 
          error: 'Authentication required',
          message: 'Please sign in again to access your emails'
        }, { status: 401 });
      }
    }
  
    console.log('[Email API] Getting Google client...');
    let { gmail } = await getGoogleClient(accessToken);
    
    // Function to retry fetching emails with token refresh
    async function fetchEmailsWithRetry(retryCount = 0): Promise<NextResponse> {
      try {
        console.log(`[Email API] Fetching email list... (attempt ${retryCount + 1})`);
        const response = await gmail.users.messages.list({
          userId: 'me',
          maxResults: 10,
        });
        
        if (!response.data.messages || response.data.messages.length === 0) {
          console.log('[Email API] No messages found');
          return NextResponse.json({ emails: [] });
        }
        
        console.log(`[Email API] Found ${response.data.messages.length} messages, fetching details...`);
        
        const emails = [];
        for (const message of response.data.messages) {
          const email = await gmail.users.messages.get({
            userId: 'me',
            id: message.id as string,
          });
          emails.push(email.data);
        }
        
        console.log(`[Email API] Successfully fetched ${emails.length} emails`);
        return NextResponse.json({ emails });
      } catch (error: any) {
        // Handle specific Google API errors
        if ((error.code === 401 || (error.response && error.response.status === 401)) && retryCount < 1) {
          console.error('[Email API] Invalid credentials, attempting token refresh...');
          
          if (token && token.refreshToken) {
            const refreshedToken = await refreshGoogleAccessToken(token);
            if (!refreshedToken.error && refreshedToken.accessToken) {
              console.log('[Email API] Refresh successful, trying again...');
              // Create a new client with the refreshed token
              const refreshedClient = await getGoogleClient(refreshedToken.accessToken);
              gmail = refreshedClient.gmail;
              return fetchEmailsWithRetry(retryCount + 1);
            }
          }
          
          // If refresh failed or we couldn't refresh, return error
          return NextResponse.json({ 
            error: 'Authentication expired', 
            details: 'Your Google access token has expired. Please sign out and sign in again.'
          }, { status: 401 });
        }
        
        throw error; // re-throw for the outer catch to handle
      }
    }
    
    // Try to fetch emails with retry logic
    return await fetchEmailsWithRetry();
  } catch (error) {
    console.error('[Email API] Error fetching emails:', error);
    // Return more detailed error information
    return NextResponse.json({ 
      error: 'Failed to fetch emails', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST handler for sending emails
export async function POST(request: NextRequest) {
  try {
    // Make sure NextAuth Secret is set
    if (!process.env.NEXTAUTH_SECRET) {
      console.error('[Email API] NEXTAUTH_SECRET not set in environment');
      return NextResponse.json({ error: 'Server misconfiguration - auth secret missing' }, { status: 500 });
    }
    
    // Try to get both token and session
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    const session = await getServerSession(authOptions);
    
    console.log('[Email API] Session exists:', !!session);
    console.log('[Email API] Direct token exists:', !!token);
    
    // Determine which access token to use
    let accessToken = session?.accessToken || token?.accessToken;
    
    if (!accessToken && token?.refreshToken) {
      // Try to refresh the token
      const refreshedToken = await refreshGoogleAccessToken(token);
      if (!refreshedToken.error && refreshedToken.accessToken) {
        console.log('[Email API] Successfully refreshed token for email sending');
        accessToken = refreshedToken.accessToken;
      }
    }
    
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please sign in again to send emails' 
      }, { status: 401 });
    }
    
    const { to, subject, body } = await request.json();
    
    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Function to retry sending email with token refresh
    async function sendEmailWithRetry(retryCount = 0): Promise<NextResponse> {
      try {
        console.log(`[Email API] Sending email... (attempt ${retryCount + 1})`);
        const { gmail } = await getGoogleClient(accessToken as string);
        
        const message = [
          'Content-Type: text/plain; charset="UTF-8"',
          'MIME-Version: 1.0',
          `To: ${to}`,
          `Subject: ${subject}`,
          '',
          body
        ].join('\n');
        
        const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        
        const res = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
          },
        });
        
        console.log('[Email API] Email sent successfully');
        return NextResponse.json({ success: true, messageId: res.data.id });
      } catch (error: any) {
        // Handle specific Google API errors
        if ((error.code === 401 || (error.response && error.response.status === 401)) && retryCount < 1 && token?.refreshToken) {
          console.error('[Email API] Invalid credentials when sending, attempting token refresh...');
          
          const refreshedToken = await refreshGoogleAccessToken(token);
          if (!refreshedToken.error && refreshedToken.accessToken) {
            console.log('[Email API] Refresh successful, trying to send again...');
            accessToken = refreshedToken.accessToken;
            return sendEmailWithRetry(retryCount + 1);
          }
          
          // If refresh failed or we couldn't refresh, return error
          return NextResponse.json({ 
            error: 'Authentication expired', 
            details: 'Your Google access token has expired. Please sign out and sign in again.'
          }, { status: 401 });
        }
        
        throw error; // re-throw for the outer catch to handle
      }
    }
    
    // Attempt to send email with retry
    return await sendEmailWithRetry();
  } catch (error) {
    console.error('[Email API] Error sending email:', error);
    return NextResponse.json({ 
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 