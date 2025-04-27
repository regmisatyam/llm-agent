import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function POST(request: NextRequest) {
  try {
    const { action, content } = await request.json();
    console.log(`Gemini API - Processing ${action} request`);
    
    if (!action || !content) {
      console.log('Gemini API - Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    let prompt = '';
    let result;
    
    switch (action) {
      case 'summarize':
        prompt = `Summarize the following content in a concise way, highlighting key points and any action items:
        
        ${content}`;
        result = await model.generateContent(prompt);
        return NextResponse.json({ summary: result.response.text() });
        
      case 'draftReply':
        prompt = `Draft a professional reply to the following email:
        
        ${content}`;
        result = await model.generateContent(prompt);
        return NextResponse.json({ reply: result.response.text() });
        
      case 'chat':
        console.log('Gemini API - Processing chat request');
        prompt = `You are a helpful AI assistant. Please answer the following question or respond to the request as concisely and helpfully as possible. If you don't know the answer, just say you don't know rather than making up information.

Question or request: "${content}"`;
        
        console.log('Gemini API - Sending chat prompt to model');
        result = await model.generateContent(prompt);
        const responseText = result.response.text();
        console.log('Gemini API - Received chat response');
        
        return NextResponse.json({ response: responseText });
        
      case 'parseEvent':
        console.log('Gemini API - Parsing calendar event');
        prompt = `You are a calendar event parser. Extract calendar event details from this text: "${content}"

Return a valid JSON object with these fields:
1. title: The name/title of the event
2. startTime: Start time in 24-hour format (HH:MM, e.g., "14:00" for 2 PM)
3. endTime: End time in 24-hour format (HH:MM)
4. date: Date in YYYY-MM-DD format. If a relative date like "tomorrow" is mentioned, calculate the actual date based on today being ${new Date().toISOString().split('T')[0]}.
5. description: Brief description of the event purpose
6. attendees: Comma-separated list of email addresses, or empty string if none

VERY IMPORTANT: 
- If no specific time is mentioned for endTime, make it 1 hour after startTime
- If no specific date is given, use today's date (${new Date().toISOString().split('T')[0]})
- If "tomorrow" is mentioned, use ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}
- If "next week" is mentioned, use ${new Date(Date.now() + 7*86400000).toISOString().split('T')[0]}
- Make sure all fields exist in your response, even if values are empty strings
- Return ONLY the JSON object with no explanations or markdown
- Make sure the JSON is correctly formatted with double quotes around keys and string values

Input: "${content}"`;

        console.log('Gemini API - Sending prompt to model');
        result = await model.generateContent(prompt);
        const eventResponseText = result.response.text();
        console.log('Gemini API - Received response:', eventResponseText);
        
        try {
          // Clean up the response text to ensure it's valid JSON
          let cleanedResponse = eventResponseText.replace(/```json|```/g, '').trim();
          
          // Sometimes Gemini includes extra text - find the first { and last }
          const firstBrace = cleanedResponse.indexOf('{');
          const lastBrace = cleanedResponse.lastIndexOf('}');
          
          if (firstBrace >= 0 && lastBrace >= 0) {
            cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
          }
          
          console.log('Gemini API - Cleaned JSON:', cleanedResponse);
          const parsedEvent = JSON.parse(cleanedResponse);
          
          // Verify all required fields exist
          const requiredFields = ['title', 'startTime', 'endTime', 'date', 'description'];
          const missingFields = requiredFields.filter(field => typeof parsedEvent[field] === 'undefined');
          
          if (missingFields.length > 0) {
            console.log(`Gemini API - Missing fields in parsed event: ${missingFields.join(', ')}`);
            return NextResponse.json({ 
              error: `Event parsing incomplete: missing fields: ${missingFields.join(', ')}`,
              partialEvent: parsedEvent,
              rawResponse: eventResponseText
            }, { status: 422 });
          }
          
          // Make sure date is in YYYY-MM-DD format
          if (!/^\d{4}-\d{2}-\d{2}$/.test(parsedEvent.date)) {
            // Try to convert to proper format
            const dateObj = new Date(parsedEvent.date);
            if (!isNaN(dateObj.getTime())) {
              parsedEvent.date = dateObj.toISOString().split('T')[0];
            } else {
              console.log('Gemini API - Invalid date format:', parsedEvent.date);
              return NextResponse.json({ 
                error: 'Invalid date format in parsed event',
                partialEvent: parsedEvent,
                rawResponse: eventResponseText
              }, { status: 422 });
            }
          }
          
          // Make sure times are in HH:MM format
          ['startTime', 'endTime'].forEach(timeField => {
            if (!/^\d{1,2}:\d{2}$/.test(parsedEvent[timeField])) {
              // Try to fix common time format issues
              const timeMatch = parsedEvent[timeField].match(/(\d{1,2})[:\s]*(\d{2})/);
              if (timeMatch) {
                parsedEvent[timeField] = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
              } else {
                console.log(`Gemini API - Invalid time format for ${timeField}:`, parsedEvent[timeField]);
                return NextResponse.json({ 
                  error: `Invalid time format for ${timeField}`,
                  partialEvent: parsedEvent,
                  rawResponse: eventResponseText
                }, { status: 422 });
              }
            }
          });
          
          console.log('Gemini API - Successfully parsed event:', parsedEvent);
          return NextResponse.json({ event: parsedEvent });
        } catch (error) {
          console.error('Failed to parse calendar event:', error);
          return NextResponse.json({ 
            error: 'Failed to parse event details',
            details: error instanceof Error ? error.message : String(error),
            response: eventResponseText
          }, { status: 500 });
        }
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
} 