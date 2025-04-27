'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function EmailPage() {
  const { data: session, status } = useSession();
  const [emails, setEmails] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [summary, setSummary] = useState<string>('');
  const [draftReply, setDraftReply] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [replyTo, setReplyTo] = useState<string>('');
  const [replySubject, setReplySubject] = useState<string>('');
  const [replyBody, setReplyBody] = useState<string>('');
  
  // New state for compose functionality
  const [showCompose, setShowCompose] = useState<boolean>(false);
  const [composeTo, setComposeTo] = useState<string>('');
  const [composeSubject, setComposeSubject] = useState<string>('');
  const [composeBody, setComposeBody] = useState<string>('');
  const [composePrompt, setComposePrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEffect(() => {
    if (status === 'authenticated') {
      loadEmails();
    }
  }, [status]);

  async function loadEmails() {
    setLoading(true);
    try {
      const response = await fetch('/api/email');
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Email fetch error:', errorData);
        throw new Error(`Failed to fetch emails: ${errorData.error || response.status}`);
      }
      
      const data = await response.json();
      console.log('Email data received:', data);
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  }

  // Helper to extract email content
  const getEmailContent = (email: any) => {
    if (!email || !email.payload) return '';
    
    const getBody = (part: { mimeType?: string; body?: { data?: string }; parts?: any[] }): string => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString();
      }
      
      if (part.parts) {
        for (const subPart of part.parts) {
          const body = getBody(subPart);
          if (body) return body;
        }
      }
      
      return '';
    };
    
    return getBody(email.payload);
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

  // Helper to extract sender name
  const getSenderName = (email: any) => {
    if (!email || !email.payload || !email.payload.headers) return '';
    
    const fromHeader = email.payload.headers.find(
      (header: any) => header.name.toLowerCase() === 'from'
    );
    
    if (!fromHeader) return '';
    
    const fromValue = fromHeader.value;
    const nameMatch = fromValue.match(/^([^<]+)</);
    
    return nameMatch ? nameMatch[1].trim() : fromValue;
  };

  // Helper to get initials from sender name
  const getSenderInitials = (email: any) => {
    const name = getSenderName(email);
    if (!name) return '';
    
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Helper to format date
  const formatEmailDate = (email: any) => {
    if (!email || !email.internalDate) return '';
    
    const date = new Date(parseInt(email.internalDate));
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleSelectEmail = async (email: any) => {
    setSelectedEmail(email);
    setSummary('');
    setDraftReply('');
    setReplyTo(getEmailSender(email));
    setReplySubject(`Re: ${getEmailSubject(email)}`);
    setReplyBody('');
    setShowCompose(false);
  };

  const handleSummarize = async () => {
    if (!selectedEmail) return;
    
    setLoading(true);
    try {
      const content = getEmailContent(selectedEmail);
      
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'summarize',
          content,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to summarize email');
      
      const data = await response.json();
      setSummary(data.summary || '');
    } catch (error) {
      console.error('Error summarizing email:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDraftReply = async () => {
    if (!selectedEmail) return;
    
    setLoading(true);
    try {
      const content = getEmailContent(selectedEmail);
      
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'draftReply',
          content,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to draft reply');
      
      const data = await response.json();
      const reply = data.reply || '';
      setDraftReply(reply);
      setReplyBody(reply);
    } catch (error) {
      console.error('Error drafting reply:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyTo || !replySubject || !replyBody) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: replyTo,
          subject: replySubject,
          body: replyBody,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to send email');
      
      setReplyBody('');
      setDraftReply('');
      alert('Email sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // New handler for generating email from prompt
  const handleGenerateFromPrompt = async () => {
    if (!composePrompt) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generateEmail',
          prompt: composePrompt,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate email content');
      
      const data = await response.json();
      const generatedContent = data.content || '';
      setComposeBody(generatedContent);
    } catch (error) {
      console.error('Error generating email content:', error);
      alert('Failed to generate email content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // New handler for sending composed email
  const handleSendComposed = async () => {
    if (!composeTo || !composeSubject || !composeBody) {
      alert('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          body: composeBody,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to send email');
      
      // Reset compose form
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setComposePrompt('');
      setShowCompose(false);
      
      alert('Email sent successfully!');
      loadEmails(); // Refresh email list
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle compose mode
  const toggleCompose = () => {
    setShowCompose(!showCompose);
    if (!showCompose) {
      setSelectedEmail(null);
      setSummary('');
      setDraftReply('');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">Loading Email</h1>
          <p className="text-gray-500">Please wait while we fetch your emails...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Email Access Required</h1>
            <p className="text-gray-600 mb-6">
              Please sign in with Google to access your emails and get AI-powered assistance with your messages.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
          Email Management
        </h1>
        <div className="flex gap-3">
          <button 
            onClick={loadEmails} 
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={toggleCompose}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            {showCompose ? (
              <span>Cancel</span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                <span>Compose</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            <div className="border-b">
              <div className="flex divide-x">
                <button className="flex-1 py-3 px-4 bg-blue-50 text-blue-600 font-medium">Inbox</button>

              </div>
            </div>
            
            <div className="max-h-[calc(100vh-220px)] overflow-auto">
              {loading && !emails.length ? (
                <div className="flex justify-center p-6">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : emails.length === 0 ? (
                <div className="text-center p-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500">No emails found</p>
                </div>
              ) : (
                <div>
                  {emails.map((email) => (
                    <div 
                      key={email.id} 
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedEmail?.id === email.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleSelectEmail(email)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                          {getSenderInitials(email)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start gap-2">
                            <p className="font-medium truncate">{getSenderName(email)}</p>
                            <span className="text-xs text-gray-500 flex-shrink-0">{formatEmailDate(email)}</span>
                          </div>
                          <p className="text-sm font-semibold truncate">{getEmailSubject(email)}</p>
                          <p className="text-xs text-gray-500 truncate mt-1">{getEmailContent(email).substring(0, 60)}...</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Email Content & AI Tools */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-md h-full border border-gray-200">
            {showCompose ? (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Compose New Email</h2>
                  <button 
                    onClick={toggleCompose} 
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h3 className="font-semibold text-blue-800">AI Email Generator</h3>
                  </div>
                  <textarea
                    placeholder="Describe what you want to write about. For example: 'Write a professional email to schedule a meeting with John about the new project requirements'"
                    value={composePrompt}
                    onChange={(e) => setComposePrompt(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <button
                    onClick={handleGenerateFromPrompt}
                    className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                    disabled={isGenerating || !composePrompt}
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Generate Email Content</span>
                      </>
                    )}
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                    <input
                      type="email"
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="recipient@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Email subject"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      rows={10}
                      className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Write your message here or use the AI generator above"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleSendComposed}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center shadow-md hover:shadow-lg"
                      disabled={loading || !composeTo || !composeSubject || !composeBody}
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span>Send Email</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedEmail ? (
              <div className="p-6">
                <div className="mb-6">
                  <div className="mb-4 flex justify-between">
                    <div>
                      <h2 className="text-xl font-bold mb-2">{getEmailSubject(selectedEmail)}</h2>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                          {getSenderInitials(selectedEmail)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{getSenderName(selectedEmail)}</p>
                          <p className="text-xs text-gray-500">{getEmailSender(selectedEmail)}</p>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedEmail(null)} 
                      className="p-1 h-fit rounded-full hover:bg-gray-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 whitespace-pre-wrap">
                    {getEmailContent(selectedEmail)}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={handleSummarize}
                    className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    Summarize
                  </button>
                  <button
                    onClick={handleDraftReply}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    )}
                    Draft Reply
                  </button>
                </div>
                
                {summary && (
                  <div className="mb-6 p-5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-indigo-100 animate-fadeIn">
                    <div className="flex items-center gap-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <h3 className="font-semibold text-indigo-800">AI Summary</h3>
                    </div>
                    <p className="text-gray-700">{summary}</p>
                  </div>
                )}
                
                {draftReply && (
                  <div className="mt-6 animate-slideUp">
                    <h3 className="text-lg font-bold mb-4">Reply</h3>
                    <div className="space-y-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                        <input
                          type="email"
                          value={replyTo}
                          onChange={(e) => setReplyTo(e.target.value)}
                          className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <input
                          type="text"
                          value={replySubject}
                          onChange={(e) => setReplySubject(e.target.value)}
                          className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          rows={6}
                          className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                      <button
                        onClick={handleSendReply}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center shadow-md hover:shadow-lg float-right"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            <span>Send Reply</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
                <p className="text-xl font-medium mb-2">No Email Selected</p>
                <p className="text-gray-500 mb-8 max-w-md text-center">
                  Select an email from your inbox to view its content or compose a new message.
                </p>
                <button
                  onClick={toggleCompose}
                  className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  <span>Compose New Email</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Add these animations to your global CSS if you haven't already
// @keyframes fadeIn {
//   from { opacity: 0; }
//   to { opacity: 1; }
// }
// 
// @keyframes slideUp {
//   from { transform: translateY(20px); opacity: 0; }
//   to { transform: translateY(0); opacity: 1; }
// }
// 
// .animate-fadeIn {
//   animation: fadeIn 0.5s ease-out forwards;
// }
// 
// .animate-slideUp {
//   animation: slideUp 0.5s ease-out forwards;
// } 