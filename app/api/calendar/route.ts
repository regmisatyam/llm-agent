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

// Function to verify the event data is properly formatted
function validateAndFormatEvent(eventData: any) {
  const { summary, description, start, end, attendees } = eventData;
  
  if (!summary || !start || !end) {
    throw new Error('Missing required fields (summary, start, or end)');
  }
  
  // Validate start and end have dateTime properties
  if (!start.dateTime || !end.dateTime) {
    throw new Error('Start and end must have dateTime properties');
  }
  
  // Create a properly formatted event object
  const formattedEvent: {
    summary: string;
    description: string;
    start: {
      dateTime: string;
      timeZone: string;
    };
    end: {
      dateTime: string;
      timeZone: string;
    };
    attendees?: Array<{email: string}>;
  } = {
    summary,
    description: description || '',
    start: {
      dateTime: start.dateTime,
      timeZone: start.timeZone || 'UTC'
    },
    end: {
      dateTime: end.dateTime,
      timeZone: end.timeZone || 'UTC'
    }
  };
  
  // Only add attendees if they exist
  if (attendees && Array.isArray(attendees) && attendees.length > 0) {
    formattedEvent.attendees = attendees;
  }
  
  return formattedEvent;
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
  
  console.log('Calendar POST - Session:', session ? 'exists' : 'null');
  
  if (!session?.accessToken) {
    console.log('Calendar POST - No access token in session');
    return NextResponse.json({ error: 'Not authenticated or missing access token' }, { status: 401 });
  }
  
  try {
    const eventData = await request.json();
    console.log('Calendar POST - Received event data:', eventData);
    
    // Validate and format the event data
    const formattedEvent = validateAndFormatEvent(eventData);
    
    console.log('Calendar POST - Getting Google client...');
    const { calendar } = await getGoogleClient(session.accessToken as string);
    
    console.log('Calendar POST - Creating event with formatted data:', formattedEvent);
    
    // Create the event using the validated data
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: formattedEvent,
      sendUpdates: 'all', // Send emails to attendees
    });
    
    if (!response || !response.data || !response.data.id) {
      throw new Error('Failed to create event: No event ID returned');
    }
    
    console.log('Calendar POST - Event created successfully with ID:', response.data.id);
    console.log('Calendar POST - Event link:', response.data.htmlLink);
    
    return NextResponse.json({ 
      success: true, 
      event: response.data,
      link: response.data.htmlLink
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Calendar POST - Detailed error:', errorMessage);
    
    return NextResponse.json({ 
      error: 'Failed to create calendar event', 
      details: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 