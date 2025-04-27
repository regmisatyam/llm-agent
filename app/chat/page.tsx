'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { VoiceRecognition } from '@/utils/voice-recognition';
import Image from 'next/image';

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
  const [showContextModal, setShowContextModal] = useState(false);
  const [contextText, setContextText] = useState('');
  const [messageContext, setMessageContext] = useState<string | null>(null);
  const [isContextEnabled, setIsContextEnabled] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Initialize voice recognition
    if (typeof window !== 'undefined') {
      setVoiceRecognition(new VoiceRecognition());
      
      // Load context from localStorage
      const savedContext = localStorage.getItem('chatContext');
      const contextEnabled = localStorage.getItem('contextEnabled');
      
      if (savedContext) {
        setContextText(savedContext);
        setMessageContext(savedContext);
      }
      
      if (contextEnabled !== null) {
        setIsContextEnabled(contextEnabled === 'true');
      }
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
      
      // Include context if available and enabled
      const payload: any = {
        action: 'chat',
        content: query,
      };
      
      if (messageContext && isContextEnabled) {
        payload.context = messageContext;
      }
      
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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

  const saveContext = () => {
    localStorage.setItem('chatContext', contextText);
    setMessageContext(contextText);
    setShowContextModal(false);
    
    // Notify user that context was added
    if(contextText.trim()) {
      addBotMessage("I've added your context to our conversation. I'll keep it in mind when responding to your questions.");
    }
  };

  const clearContext = () => {
    localStorage.removeItem('chatContext');
    setContextText('');
    setMessageContext(null);
    addBotMessage("I've cleared the additional context from our conversation.");
  };

  const toggleContextEnabled = () => {
    const newState = !isContextEnabled;
    setIsContextEnabled(newState);
    localStorage.setItem('contextEnabled', String(newState));
    
    if (newState) {
      addBotMessage("Context is now enabled. I'll consider your saved context in our conversation.");
    } else {
      addBotMessage("Context is now disabled. I won't use your saved context until you enable it again.");
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
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-indigo-50 to-white">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md w-full">
          <div className="animate-pulse mb-4 mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-indigo-800">AI Chat Assistant</h1>
          <p className="text-gray-600">Loading your personalized experience...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-indigo-50 to-white">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md w-full">
          <div className="mb-6 mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-indigo-800">AI Chat Assistant</h1>
          <p className="text-gray-600 mb-6">Please sign in with Google to use the chat assistant.</p>
          <button className="bg-indigo-600 text-white rounded-full px-6 py-3 font-medium shadow-md hover:bg-indigo-700 transition-colors">
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white py-6 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-600 p-4 sm:p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Chat Assistant</h1>
                  <p className="text-white/70 text-sm">Powered by AI</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Context Indicator */}
                {messageContext && (
                  <div className="flex items-center">
                    <div 
                      className={`relative h-6 w-12 rounded-full flex items-center transition duration-200 ease-linear ${isContextEnabled ? 'bg-green-400' : 'bg-gray-400'}`}
                      onClick={toggleContextEnabled}
                    >
                      <span 
                        className={`absolute left-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-white shadow-md transform transition duration-200 ease-linear ${isContextEnabled ? 'translate-x-6' : 'translate-x-0'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${isContextEnabled ? 'text-green-600' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </div>
                    <span className="text-xs text-white/80 ml-2 hidden sm:inline">Context {isContextEnabled ? 'On' : 'Off'}</span>
                  </div>
                )}
                
                {/* Mobile menu button */}
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="sm:hidden p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                </button>
                
                {/* Desktop buttons */}
                <div className="hidden sm:flex space-x-2">
                  <button 
                    onClick={() => setShowContextModal(true)}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {messageContext ? 'Edit Context' : 'Add Context'}
                  </button>
                  {messageContext && (
                    <button 
                      onClick={clearContext}
                      className="bg-red-500/20 hover:bg-red-500/30 text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear Context
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="sm:hidden bg-indigo-50 p-3 space-y-2">
              <button 
                onClick={() => {
                  setShowContextModal(true);
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 bg-white shadow-sm rounded-lg text-indigo-700 font-medium"
              >
                {messageContext ? 'Edit Context' : 'Add Context'}
              </button>
              {messageContext && (
                <button 
                  onClick={() => {
                    clearContext();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 bg-white shadow-sm rounded-lg text-red-600 font-medium"
                >
                  Clear Context
                </button>
              )}
            </div>
          )}
          
          {/* Chat area - single container with integrated input */}
          <div className="flex flex-col h-[70vh] bg-white rounded-b-xl overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.sender === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex-shrink-0 mr-2 flex items-center justify-center overflow-hidden shadow-sm">
                      <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  <div
                    className={`px-4 py-3 rounded-2xl max-w-[75%] ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : 'bg-white border border-indigo-50 text-gray-800 shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm md:text-base">{message.content}</p>
                    <p className="text-xs mt-1 opacity-70 text-right">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  
                  {message.sender === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-200 flex-shrink-0 ml-2 flex items-center justify-center overflow-hidden shadow-sm">
                      {session?.user?.image ? (
                        <img 
                          src={session.user.image} 
                          alt={session.user.name || 'User'} 
                          className="w-8 h-8 object-cover" 
                        />
                      ) : (
                        <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input controls - floating over the bottom of content */}
            <div className="p-3 bg-gradient-to-b from-white/50 to-white flex-shrink-0">
              <div className="bg-white rounded-xl shadow-md p-3">
                <div className="flex items-center">
                  <button
                    onClick={toggleListening}
                    className={`p-3 rounded-full mr-3 flex-shrink-0 transition-all duration-200 ${
                      isListening 
                        ? 'bg-red-500 text-white hover:bg-red-600' 
                        : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
                    }`}
                    title={isListening ? "Stop listening" : "Start voice input"}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                      />
                    </svg>
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder={isListening ? 'Listening...' : 'Type a message or ask a question...'}
                      className="w-full px-4 py-3 bg-indigo-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-10 text-gray-800 placeholder-gray-500"
                      disabled={isProcessing || isListening}
                    />
                    {messageContext && (
                      <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-indigo-400" title="Context is active">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isProcessing}
                    className="ml-3 p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full disabled:opacity-50 hover:from-indigo-700 hover:to-purple-700 transition-all flex-shrink-0"
                  >
                    {isProcessing ? (
                      <svg
                        className="animate-spin h-5 w-5 text-white"
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
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
                
                {/* Voice indicator */}
                {isListening && (
                  <div className="mt-3 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <span className="animate-pulse bg-red-500 rounded-full h-2 w-2 mr-2"></span>
                      Recording... Click the microphone icon to stop.
                    </span>
                  </div>
                )}
                
                {/* Quick suggestions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {["What's in my inbox?", "My calendar this week", "Schedule a meeting", "Tell me about GAgent"].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInputMessage(suggestion)}
                      className="bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-800 text-xs px-3 py-1.5 rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Context Modal */}
      {showContextModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl transform transition-all animate-scaleIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-indigo-900">Add Context</h3>
              <button 
                onClick={() => setShowContextModal(false)}
                className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Add additional context or information to help the AI understand your questions better. 
              This context will be included with each message you send.
            </p>
            
            <textarea
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              placeholder="Example: 'I am a software developer working on a React project' or 'I need help planning a trip to Japan'"
              className="w-full bg-indigo-50 rounded-xl p-4 h-36 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-800 placeholder-gray-500"
            ></textarea>
            
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                <span className="inline-flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Saved in your browser
                </span>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowContextModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveContext}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-md"
                >
                  Save Context
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
