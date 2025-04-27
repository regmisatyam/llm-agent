'use client';

import { useState, useEffect, useRef } from 'react';

// Define SpeechRecognition interfaces
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  error: any;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionEvent) => void;
  start: () => void;
  stop: () => void;
}

// Avoid using global declarations and instead use type assertions
interface VoiceRecognitionProps {
  isListening: boolean;
  onResult: (transcript: string) => void;
  onEnd: () => void;
  language?: string;
}

export default function VoiceRecognition({
  isListening,
  onResult,
  onEnd,
  language = 'en-US'
}: VoiceRecognitionProps) {
  const recognition = useRef<SpeechRecognition | null>(null);
  const [browserSupported, setBrowserSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use type assertion to avoid global declaration conflicts
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || 
                                  (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognitionAPI) {
        console.log('Speech recognition not supported in this browser');
        setBrowserSupported(false);
        return;
      }

      recognition.current = new SpeechRecognitionAPI() as SpeechRecognition;
      if (recognition.current) {
        recognition.current.continuous = true;
        recognition.current.interimResults = true;
        recognition.current.lang = language;

        recognition.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
          onResult(transcript);
        };

        recognition.current.onend = () => {
          onEnd();
        };

        recognition.current.onerror = (event: SpeechRecognitionEvent) => {
          console.error('Speech recognition error', event.error);
          onEnd();
        };
      }
    }

    return () => {
      if (recognition.current) {
        try {
          recognition.current.stop();
        } catch (error) {
          // Ignore errors on stop (usually just means it wasn't started)
        }
      }
    };
  }, [language, onEnd, onResult]);

  useEffect(() => {
    if (!browserSupported) return;
    
    if (isListening && recognition.current) {
      try {
        recognition.current.start();
      } catch (error) {
        // Sometimes an error occurs if recognition is already running
        console.log('Could not start speech recognition', error);
      }
    } else if (!isListening && recognition.current) {
      try {
        recognition.current.stop();
      } catch (error) {
        // Ignore errors on stop
      }
    }
  }, [isListening, browserSupported]);

  // No visible UI
  return null;
} 