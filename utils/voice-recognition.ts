'use client';

// Define interface for browser's SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

type SpeechRecognitionCallback = (transcript: string) => void;

// Simple voice recognition implementation
// Note: This only uses browser-based WebSpeech API - no AI models involved

export class VoiceRecognition {
  private recognition: any = null;
  private isListening: boolean = false;
  private onResultCallback: ((transcript: string) => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor() {
    // Initialize only in browser environment
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || 
                               (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        this.setupListeners();
      }
    }
  }

  private setupListeners(): void {
    if (!this.recognition) return;
    
    this.recognition.onresult = (event: any) => {
      if (event.results && event.results.length > 0) {
        // Access transcript in a more flexible way
        const transcript = event.results[0][0].transcript;
        
        if (this.onResultCallback) {
          this.onResultCallback(transcript);
        }
      }
    };
    
    this.recognition.onend = () => {
      this.isListening = false;
      
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };
    
    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      console.error('Speech recognition error', event);
      
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };
  }

  public start(onResult: (transcript: string) => void, onEnd: () => void): boolean {
    if (!this.recognition || this.isListening) {
      return false;
    }
    
    this.onResultCallback = onResult;
    this.onEndCallback = onEnd;
    
    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      return false;
    }
  }

  public stop(): void {
    if (!this.recognition || !this.isListening) {
      return;
    }
    
    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }

  public isActive(): boolean {
    return this.isListening;
  }
}

// Polyfill for browser types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
} 