import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/auth';
import { google } from 'googleapis';

// Helper function to get authenticated Google API client
async function getGoogleClient(token: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  return {
    calendar: google.calendar({ version: 'v3', auth })
  };
}

// GET handler for fetching calendar events
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');
    
    if (!timeMin || !timeMax) {
      return NextResponse.json(
        { error: 'Missing required timeMin or timeMax parameters' }, 
        { status: 400 }
      );
    }
    
    const { calendar } = await getGoogleClient(session.accessToken as string);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return NextResponse.json({ events: response.data.items || [] });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
}

// POST handler for creating calendar events
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  try {
    const eventData = await request.json();
    const { summary, description, start, end, attendees } = eventData;
    
    if (!summary || !start || !end) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }
    
    const { calendar } = await getGoogleClient(session.accessToken as string);
    
    const event = {
      summary,
      description,
      start,
      end,
      attendees,
    };
    
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
    
    return NextResponse.json({ 
      success: true, 
      event: response.data 
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 });
  }
} 