'use client';

import { useState, useEffect } from 'react';
import { VoiceRecognition } from '@/utils/voice-recognition';

export default function VoicePage() {
  const [transcript, setTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceRecognition, setVoiceRecognition] = useState<VoiceRecognition | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check browser support for SpeechRecognition
      const isSpeechRecognitionSupported = 
        ('SpeechRecognition' in window) || 
        ('webkitSpeechRecognition' in window);
      
      setIsSupported(isSpeechRecognitionSupported);
      
      if (isSpeechRecognitionSupported) {
        const recognition = new VoiceRecognition();
        setVoiceRecognition(recognition);
      }
    }
    
    return () => {
      if (voiceRecognition && isListening) {
        voiceRecognition.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!voiceRecognition) return;
    
    if (isListening) {
      voiceRecognition.stop();
      setIsListening(false);
    } else {
      voiceRecognition.start((text) => {
        setTranscript(text);
      }, () => {
        setIsListening(false);
      });
      setIsListening(true);
    }
  };

  const clearTranscript = () => {
    setTranscript('');
  };

  const copyToClipboard = () => {
    if (transcript) {
      navigator.clipboard.writeText(transcript);
      alert('Transcript copied to clipboard!');
    }
  };

  if (!isSupported) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Voice Typing</h1>
        <div className="bg-red-100 p-4 rounded-md mb-6">
          <p className="text-red-700">
            Speech recognition is not supported in this browser. Please try using Chrome, Edge, or Safari.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Voice Typing</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Speech to Text</h2>
          <div className="flex space-x-2">
            <button
              onClick={clearTranscript}
              disabled={!transcript}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Clear
            </button>
            <button
              onClick={copyToClipboard}
              disabled={!transcript}
              className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50"
            >
              Copy
            </button>
          </div>
        </div>
        
        <div className="mb-4">
          <div 
            className={`min-h-[200px] border rounded-md p-3 ${transcript ? 'bg-white' : 'bg-gray-50'}`}
          >
            {transcript ? (
              <p className="whitespace-pre-wrap">{transcript}</p>
            ) : (
              <p className="text-gray-400 italic">Your speech will appear here...</p>
            )}
          </div>
        </div>
        
        <button
          onClick={toggleListening}
          className={`px-4 py-2 rounded text-white w-full ${
            isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isListening ? 'Stop Recording' : 'Start Recording'}
        </button>
        
        {isListening && (
          <div className="mt-4 text-center">
            <div className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full animate-pulse">
              Recording...
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Usage Instructions</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Click the "Start Recording" button to begin voice recognition.</li>
          <li>Speak clearly into your microphone.</li>
          <li>Your speech will be converted to text in real-time.</li>
          <li>Click "Stop Recording" when you're finished.</li>
          <li>Use the "Copy" button to copy the transcript to your clipboard.</li>
          <li>You can then paste it into any other application or section of this app.</li>
        </ul>
        
        <div className="mt-6 bg-indigo-50 p-4 rounded-md">
          <h3 className="font-medium mb-2">Pro Tips</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>For best results, use a quiet environment.</li>
            <li>Speak clearly and at a moderate pace.</li>
            <li>You can say punctuation like "period", "comma", "question mark", etc.</li>
            <li>Try to use this transcript for scheduling calendar events or drafting emails.</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 