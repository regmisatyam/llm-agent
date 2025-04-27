import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function POST(request: NextRequest) {
  try {
    const { action, content } = await request.json();
    
    if (!action || !content) {
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
        
      case 'parseEvent':
        prompt = `Extract calendar event details from the following text. Return a JSON object with the following fields: title, startTime, endTime, date, description, and attendees.
        
        ${content}`;
        result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        try {
          // Clean up the response text to ensure it's valid JSON
          const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
          const parsedEvent = JSON.parse(cleanedResponse);
          return NextResponse.json({ event: parsedEvent });
        } catch (error) {
          console.error('Failed to parse calendar event:', error);
          return NextResponse.json({ error: 'Failed to parse event details', response: responseText }, { status: 500 });
        }
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
} 