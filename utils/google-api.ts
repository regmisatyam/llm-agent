import { google } from 'googleapis';
import { getSession } from 'next-auth/react';

// Helper function to get authenticated Google API client
async function getGoogleClient(token: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  return {
    gmail: google.gmail({ version: 'v1', auth }),
    calendar: google.calendar({ version: 'v3', auth })
  };
}

// Gmail API functions
export async function fetchEmails(accessToken: string, maxResults = 10) {
  try {
    const { gmail } = await getGoogleClient(accessToken);
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
    });
    
    const emails = [];
    for (const message of response.data.messages || []) {
      const email = await gmail.users.messages.get({
        userId: 'me',
        id: message.id as string,
      });
      emails.push(email.data);
    }
    
    return emails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
}

export async function sendEmail(accessToken: string, to: string, subject: string, body: string) {
  try {
    const { gmail } = await getGoogleClient(accessToken);
    
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
    
    return res.data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Calendar API functions
export async function fetchCalendarEvents(accessToken: string, timeMin: string, timeMax: string) {
  try {
    const { calendar } = await getGoogleClient(accessToken);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return response.data.items;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

export async function createCalendarEvent(
  accessToken: string, 
  summary: string, 
  description: string, 
  start: { dateTime: string, timeZone: string }, 
  end: { dateTime: string, timeZone: string },
  attendees?: Array<{ email: string }>
) {
  try {
    const { calendar } = await getGoogleClient(accessToken);
    
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
    
    return response.data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
} 