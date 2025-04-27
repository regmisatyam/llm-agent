'use client';

// Define interface for browser's SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

type SpeechRecognitionCallback = (transcript: string) => void;

// Helper class to manage speech recognition
export class VoiceRecognition {
  private recognition: any;
  private isListening: boolean = false;
  private finalTranscript: string = '';
  private onResultCallback: SpeechRecognitionCallback | null = null;
  private onEndCallback: () => void = () => {};

  constructor() {
    // Use the appropriate Speech Recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported in this browser');
      return;
    }
    
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    
    this.recognition.onresult = this.handleResult.bind(this);
    this.recognition.onend = this.handleEnd.bind(this);
    this.recognition.onerror = this.handleError.bind(this);
  }

  public start(callback: SpeechRecognitionCallback, onEndCallback?: () => void): void {
    if (!this.recognition) return;
    
    this.finalTranscript = '';
    this.onResultCallback = callback;
    if (onEndCallback) this.onEndCallback = onEndCallback;
    
    this.recognition.start();
    this.isListening = true;
  }

  public stop(): void {
    if (!this.recognition) return;
    
    this.recognition.stop();
    this.isListening = false;
  }

  public isRecognitionSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  private handleResult(event: SpeechRecognitionEvent): void {
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        this.finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }
    
    if (this.onResultCallback) {
      this.onResultCallback(this.finalTranscript + interimTranscript);
    }
  }

  private handleEnd(): void {
    this.isListening = false;
    this.onEndCallback();
  }

  private handleError(event: any): void {
    console.error('Speech recognition error:', event.error);
    this.isListening = false;
  }
}

// Polyfill for browser types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
} 