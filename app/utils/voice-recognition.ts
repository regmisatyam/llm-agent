// Create or update the voice-recognition.ts file with proper TypeScript typing

// Define proper interfaces instead of using 'any'
interface SpeechRecognitionEvent {
  results: {
    item: (index: number) => {
      item: (index: number) => {
        transcript: string;
      };
    };
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

// TypeScript declarations moved to separate ambient declaration file
// to avoid conflicts with existing window properties

export class VoiceRecognition {
  private recognition: any = null;
  private isListening: boolean = false;
  private onResultCallback: ((transcript: string) => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor() {
    // Initialize only in browser environment
    if (typeof window !== 'undefined') {
      // Use type assertion to avoid TypeScript errors with Speech Recognition API
      const SpeechRecognition = 
        ('SpeechRecognition' in window) ? (window as any).SpeechRecognition :
        ('webkitSpeechRecognition' in window) ? (window as any).webkitSpeechRecognition :
        null;
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.setupListeners();
      } else {
        console.log('Speech recognition not supported in this browser');
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