import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/auth';
import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Helper function to get authenticated Google API client
async function getGoogleClient(token: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  return {
    gmail: google.gmail({ version: 'v1', auth }),
  };
}

// GET handler for fetching emails
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  console.log('Session in email API:', session ? 'exists' : 'null');
  
  if (!session?.accessToken) {
    console.log('No access token in session');
    return NextResponse.json({ error: 'Not authenticated or missing access token' }, { status: 401 });
  }
  
  try {
    console.log('Getting Google client...');
    const { gmail } = await getGoogleClient(session.accessToken as string);
    
    console.log('Fetching email list...');
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
    });
    
    if (!response.data.messages || response.data.messages.length === 0) {
      console.log('No messages found');
      return NextResponse.json({ emails: [] });
    }
    
    console.log(`Found ${response.data.messages.length} messages, fetching details...`);
    
    const emails = [];
    for (const message of response.data.messages || []) {
      const email = await gmail.users.messages.get({
        userId: 'me',
        id: message.id as string,
      });
      emails.push(email.data);
    }
    
    console.log(`Successfully fetched ${emails.length} emails`);
    return NextResponse.json({ emails });
  } catch (error) {
    console.error('Error fetching emails:', error);
    // Return more detailed error information
    return NextResponse.json({ 
      error: 'Failed to fetch emails', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST handler for sending emails
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  try {
    const { to, subject, body } = await request.json();
    
    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const { gmail } = await getGoogleClient(session.accessToken as string);
    
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
    
    return NextResponse.json({ success: true, messageId: res.data.id });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
} 