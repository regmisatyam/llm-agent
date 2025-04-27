import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Summarize email content
export async function summarizeEmail(content: string): Promise<string> {
  const prompt = `Summarize the following email in a concise way, highlighting key points and any action items:
  
  ${content}`;
  
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Draft email reply
export async function draftEmailReply(content: string): Promise<string> {
  const prompt = `Draft a professional reply to the following email:
  
  ${content}`;
  
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Parse calendar event from text
export async function parseCalendarEvent(text: string): Promise<any> {
  const prompt = `Extract calendar event details from the following text. Return a JSON object with the following fields: title, startTime, endTime, date, description, and attendees.
  
  ${text}`;
  
  const result = await model.generateContent(prompt);
  const response = result.response.text();
  
  try {
    return JSON.parse(response);
  } catch (error) {
    console.error("Failed to parse calendar event:", error);
    return null;
  }
} 