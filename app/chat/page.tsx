'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { VoiceRecognition } from '@/utils/voice-recognition';

type Message = {
  id: string;
  content: string; 
  sender: 'user' | 'bot';
  timestamp: Date;
};

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your GAgent. I can answer questions, check your emails, or help with your calendar. How can I help you today?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceRecognition, setVoiceRecognition] = useState<VoiceRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize voice recognition
    if (typeof window !== 'undefined') {
      setVoiceRecognition(new VoiceRecognition());
    }
    
    return () => {
      if (voiceRecognition && isListening) {
        voiceRecognition.stop();
      }
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleListening = () => {
    if (!voiceRecognition) return;
    
    if (isListening) {
      voiceRecognition.stop();
      setIsListening(false);
    } else {
      voiceRecognition.start((transcript) => {
        setInputMessage(transcript);
      }, () => {
        setIsListening(false);
      });
      setIsListening(true);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);
    
    try {
      // First, check if the message is about emails or calendar
      const lowerCaseInput = inputMessage.toLowerCase();
      
      if (lowerCaseInput.includes('email') || lowerCaseInput.includes('mail') || lowerCaseInput.includes('inbox')) {
        await handleEmailQuery(lowerCaseInput);
      } else if (lowerCaseInput.includes('calendar') || lowerCaseInput.includes('event') || lowerCaseInput.includes('appointment') || lowerCaseInput.includes('schedule')) {
        await handleCalendarQuery(lowerCaseInput);
      } else {
        // Otherwise, use Gemini for general questions
        await handleGeneralQuery(inputMessage);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      addBotMessage('Sorry, I encountered an error while processing your request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const addBotMessage = (content: string) => {
    const botMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'bot',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, botMessage]);
  };

  const handleEmailQuery = async (query: string) => {
    try {
      // Add waiting message
      addBotMessage('Fetching your emails...');
      
      const response = await fetch('/api/email');
      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }
      
      const data = await response.json();
      const emails = data.emails || [];
      
      if (emails.length === 0) {
        addBotMessage('You don\'t have any recent emails.');
        return;
      }
      
      // Process the first 5 emails to show
      const emailSummary = emails.slice(0, 5).map((email: any) => {
        const subject = getEmailSubject(email);
        const sender = getEmailSender(email);
        return `- From: ${sender}, Subject: ${subject}`;
      }).join('\n');
      
      addBotMessage(`Here are your recent emails:\n\n${emailSummary}\n\nYou have ${emails.length} emails in total.`);
    } catch (error) {
      console.error('Error fetching emails:', error);
      addBotMessage('Sorry, I couldn\'t fetch your emails. Please make sure you\'re signed in with your Google account.');
    }
  };

  const handleCalendarQuery = async (query: string) => {
    try {
      // Add waiting message
      addBotMessage('Checking your calendar...');
      
      // Calculate date range for this week
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      
      const timeMin = startOfWeek.toISOString();
      const timeMax = endOfWeek.toISOString();
      
      const response = await fetch(
        `/api/calendar?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }
      
      const data = await response.json();
      const events = data.events || [];
      
      if (events.length === 0) {
        addBotMessage('You don\'t have any upcoming events for this week.');
        return;
      }
      
      // Process events to show
      const eventSummary = events.map((event: any) => {
        const date = new Date(event.start.dateTime || event.start.date).toLocaleDateString();
        const time = event.start.dateTime 
          ? new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'All day';
        return `- ${event.summary} on ${date} at ${time}`;
      }).join('\n');
      
      addBotMessage(`Here are your upcoming events:\n\n${eventSummary}`);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      addBotMessage('Sorry, I couldn\'t fetch your calendar events. Please make sure you\'re signed in with your Google account.');
    }
  };

  const handleGeneralQuery = async (query: string) => {
    try {
      // Add waiting message
      addBotMessage('Thinking...');
      
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'chat',
          content: query,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }
      
      const data = await response.json();
      
      // Replace the "Thinking..." message with the actual response
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          id: Date.now().toString(),
          content: data.response || 'I\'m not sure how to answer that.',
          sender: 'bot',
          timestamp: new Date()
        };
        return newMessages;
      });
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Replace the "Thinking..." message with an error message
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          id: Date.now().toString(),
          content: 'Sorry, I encountered an error while processing your request. Please try again.',
          sender: 'bot',
          timestamp: new Date()
        };
        return newMessages;
      });
    }
  };

  // Helper to extract email subject
  const getEmailSubject = (email: any) => {
    if (!email || !email.payload || !email.payload.headers) return '';
    
    const subjectHeader = email.payload.headers.find(
      (header: any) => header.name.toLowerCase() === 'subject'
    );
    
    return subjectHeader ? subjectHeader.value : '';
  };

  // Helper to extract sender email
  const getEmailSender = (email: any) => {
    if (!email || !email.payload || !email.payload.headers) return '';
    
    const fromHeader = email.payload.headers.find(
      (header: any) => header.name.toLowerCase() === 'from'
    );
    
    if (!fromHeader) return '';
    
    const fromValue = fromHeader.value;
    const emailMatch = fromValue.match(/<([^>]+)>/);
    
    return emailMatch ? emailMatch[1] : fromValue;
  };

  if (status === 'loading') {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold mb-4">AI Chat Assistant</h1>
        <p className="mb-4">Loading...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold mb-4">AI Chat Assistant</h1>
        <p className="mb-4">Please sign in with Google to use the chat assistant.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">AI Chat Assistant</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-4 h-[70vh] flex flex-col">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto mb-4 p-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${
                message.sender === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              <div
                className={`inline-block rounded-lg px-4 py-2 max-w-[80%] ${
                  message.sender === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input area */}
        <div className="border-t pt-4">
          <div className="flex items-center">
            <button
              onClick={toggleListening}
              className={`p-2 rounded-full mr-2 ${
                isListening ? 'bg-red-500 text-white' : 'bg-gray-200'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isListening ? 'Listening...' : 'Type a message or ask a question...'}
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isProcessing || isListening}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isProcessing}
              className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing
                </span>
              ) : (
                'Send'
              )}
            </button>
          </div>
          
          {/* Voice indicator */}
          {isListening && (
            <div className="mt-2 text-sm text-center">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <span className="animate-pulse bg-red-400 rounded-full h-2 w-2 mr-2"></span>
                Recording... Click the microphone icon to stop.
              </span>
            </div>
          )}
          
          <div className="mt-4 text-xs text-gray-500">
            <p>Try asking:</p>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>"What's in my inbox?" or "Show me my recent emails"</li>
              <li>"What's on my calendar?" or "What appointments do I have this week?"</li>
              <li>"Schedule a meeting tomorrow at 3pm"</li>
              <li>Or ask me any general questions!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 