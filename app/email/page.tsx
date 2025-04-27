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
    
    const getBody = (part: any): string => {
      if (part.mimeType === 'text/plain' && part.body.data) {
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

  const handleSelectEmail = async (email: any) => {
    setSelectedEmail(email);
    setSummary('');
    setDraftReply('');
    setReplyTo(getEmailSender(email));
    setReplySubject(`Re: ${getEmailSubject(email)}`);
    setReplyBody('');
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

  if (status === 'loading') {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold mb-4">Email Management</h1>
        <p className="mb-4">Loading...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold mb-4">Email Management</h1>
        <p className="mb-4">Please sign in with Google to access your emails.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Email Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Email List */}
        <div className="bg-white rounded-lg shadow-md p-4 md:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Recent Emails</h2>
          
          {loading && !emails.length ? (
            <p className="text-gray-500">Loading emails...</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {emails.map((email) => (
                <li 
                  key={email.id} 
                  className={`py-3 cursor-pointer hover:bg-gray-50 ${
                    selectedEmail?.id === email.id ? 'bg-indigo-50' : ''
                  }`}
                  onClick={() => handleSelectEmail(email)}
                >
                  <p className="font-medium truncate">{getEmailSubject(email)}</p>
                  <p className="text-sm text-gray-500 truncate">{getEmailSender(email)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Email Content & AI Tools */}
        <div className="bg-white rounded-lg shadow-md p-4 md:col-span-2">
          {selectedEmail ? (
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-semibold">{getEmailSubject(selectedEmail)}</h2>
                <p className="text-gray-600 mb-2">From: {getEmailSender(selectedEmail)}</p>
                <div className="border-t pt-2 whitespace-pre-wrap">
                  {getEmailContent(selectedEmail)}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={handleSummarize}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  disabled={loading}
                >
                  Summarize
                </button>
                <button
                  onClick={handleDraftReply}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  disabled={loading}
                >
                  Draft Reply
                </button>
              </div>
              
              {summary && (
                <div className="mb-4 p-4 bg-gray-50 rounded-md">
                  <h3 className="font-medium mb-2">AI Summary</h3>
                  <p>{summary}</p>
                </div>
              )}
              
              {draftReply && (
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Reply</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">To</label>
                      <input
                        type="email"
                        value={replyTo}
                        onChange={(e) => setReplyTo(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Subject</label>
                      <input
                        type="text"
                        value={replySubject}
                        onChange={(e) => setReplySubject(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Message</label>
                      <textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        rows={6}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      />
                    </div>
                    <button
                      onClick={handleSendReply}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      disabled={loading}
                    >
                      Send Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">Select an email to view its content.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 