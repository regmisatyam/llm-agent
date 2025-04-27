'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function SummaryPage() {
  const { data: session } = useSession();
  const [content, setContent] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSummarize = async () => {
    if (!content) return;
    
    setLoading(true);
    try {
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
      
      if (!response.ok) throw new Error('Failed to summarize content');
      
      const data = await response.json();
      setSummary(data.summary || '');
    } catch (error) {
      console.error('Error summarizing content:', error);
      setSummary('Failed to generate summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setContent('');
    setSummary('');
  };

  const copyToClipboard = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      alert('Summary copied to clipboard!');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Content Summarization</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Input Text</h2>
            <button
              onClick={clearAll}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Clear All
            </button>
          </div>
          
          <div className="mb-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your email, document, or any text you want to summarize..."
              rows={10}
              className="w-full border border-gray-300 rounded-md shadow-sm p-3"
            />
          </div>
          
          <button
            onClick={handleSummarize}
            disabled={!content || loading}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Summarizing...' : 'Summarize'}
          </button>
        </div>
        
        {/* Output */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Summary</h2>
            {summary && (
              <button
                onClick={copyToClipboard}
                className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
              >
                Copy
              </button>
            )}
          </div>
          
          <div 
            className={`min-h-[320px] border rounded-md p-3 ${summary ? 'bg-white' : 'bg-gray-50'}`}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : summary ? (
              <div className="whitespace-pre-wrap">{summary}</div>
            ) : (
              <p className="text-gray-400 italic text-center mt-32">
                Your summary will appear here...
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">About Summarization</h2>
        <p className="mb-4">
          This tool uses the Google Gemini AI to generate concise summaries of text content. 
          It works well for emails, articles, meeting notes, and other documents.
        </p>
        
        <h3 className="font-medium mb-2">Best Practices</h3>
        <ul className="list-disc pl-5 space-y-1 mb-4">
          <li>Provide complete sentences and paragraphs for better results.</li>
          <li>The more context you provide, the better the summary will be.</li>
          <li>For very long documents, try summarizing sections individually.</li>
          <li>The AI may rearrange information to produce a more coherent summary.</li>
        </ul>
        
        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="font-medium mb-2">Pro Tip</h3>
          <p>
            You can also summarize content from the Email page by clicking the "Summarize" button on any selected email.
          </p>
        </div>
      </div>
    </div>
  );
} 