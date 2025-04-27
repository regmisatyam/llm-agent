'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { initObjectDetection, detectObjects, drawDetections, DetectedObject } from '../utils/object-detection';
import { VoiceRecognition } from '../utils/voice-recognition';

export default function ObjectDetectionPage() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detections, setDetections] = useState<DetectedObject[]>([]);
  const [fps, setFps] = useState(0);
  const [showInfo, setShowInfo] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [isProcessingChat, setIsProcessingChat] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatHistory, setChatHistory] = useState<{text: string, sender: 'user' | 'ai', timestamp: Date}[]>([
    {
      text: "Hello! I can tell you about objects I detect in the camera. Try asking me something like 'What objects do you see?' or 'Tell me about the person in the image.'",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const voiceRecognitionRef = useRef<VoiceRecognition | null>(null);

  // Initialize object detection model and voice recognition
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      try {
        const isInitialized = await initObjectDetection();
        if (!isInitialized) {
          setErrorMessage('Failed to initialize object detection model');
        }
        
        // Initialize voice recognition
        if (typeof window !== 'undefined') {
          voiceRecognitionRef.current = new VoiceRecognition();
        }
      } catch (error) {
        console.error('Error initializing object detection:', error);
        setErrorMessage('Error initializing object detection');
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();

    return () => {
      stopCamera();
      stopVoiceRecognition();
      
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []);

  // Setup stats interval to calculate FPS
  useEffect(() => {
    statsIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTimeRef.current;
      if (elapsed > 0) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        setFps(currentFps);
      }
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }, 1000);

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const startCamera = async () => {
    if (!videoRef.current) return;
    
    try {
      // Get camera stream with higher resolution if possible
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setIsCameraActive(true);
      setErrorMessage(null);
      
      // Start object detection when video is ready
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current && canvasRef.current) {
          // Set canvas size to match video
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          
          // Start detection loop
          startObjectDetection();
        }
      };
    } catch (error) {
      console.error('Error accessing camera:', error);
      setErrorMessage('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    // Clear detection interval
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraActive(false);
    setDetections([]);
  };

  const startObjectDetection = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Use requestAnimationFrame for smoother performance
    const detectFrame = async () => {
      if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
      
      try {
        // Only process if video is playing and has dimensions
        if (videoRef.current.readyState === 4) {
          // Detect objects in the current video frame
          const objects = await detectObjects(videoRef.current);
          setDetections(objects);
          
          // Draw bounding boxes on canvas
          drawDetections(canvasRef.current, objects, {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight
          });
          
          // Update frame count for FPS calculation
          frameCountRef.current++;
        }
      } catch (error) {
        console.error('Error in detection frame:', error);
      }
      
      // Continue detection loop if camera is still active
      if (streamRef.current && streamRef.current.active) {
        requestAnimationFrame(detectFrame);
      }
    };
    
    // Start the detection loop
    detectFrame();
  };

  // Toggle the info panel
  const toggleInfo = () => {
    setShowInfo(prev => !prev);
  };

  // Toggle voice recognition
  const toggleVoiceRecognition = () => {
    if (isProcessingChat || !isCameraActive || detections.length === 0) return;
    
    if (isListening) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition();
    }
  };

  // Start voice recognition
  const startVoiceRecognition = () => {
    if (!voiceRecognitionRef.current || isListening) return;
    
    if (voiceRecognitionRef.current.start(
      // onResult callback
      (transcript) => {
        setChatMessage(transcript);
      },
      // onEnd callback
      () => {
        setIsListening(false);
      }
    )) {
      setIsListening(true);
    }
  };

  // Stop voice recognition
  const stopVoiceRecognition = () => {
    if (!voiceRecognitionRef.current || !isListening) return;
    
    voiceRecognitionRef.current.stop();
    setIsListening(false);
    
    // If there's text in the input, send the message after a short delay
    if (chatMessage.trim()) {
      setTimeout(() => {
        sendChatMessage();
      }, 500);
    }
  };

  // Capture the current frame from video as a data URL
  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw video frame to canvas
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL (base64 encoded image)
        return canvas.toDataURL('image/jpeg', 0.7); // Use JPEG with 70% quality for smaller size
      }
    } catch (error) {
      console.error('Error capturing frame:', error);
    }
    
    return null;
  };

  // Send a message to Gemini API about the detected objects
  const sendChatMessage = async () => {
    if (!chatMessage.trim() || isProcessingChat || detections.length === 0) return;
    
    // Stop voice recognition if it's active
    if (isListening) {
      stopVoiceRecognition();
    }
    
    // Add user message to chat history
    const userMessage = {
      text: chatMessage,
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    setChatHistory(prev => [...prev, userMessage]);
    setChatMessage('');
    setIsProcessingChat(true);
    
    try {
      // Add a "thinking" message
      const thinkingMessageId = Date.now().toString();
      setChatHistory(prev => [...prev, {
        text: 'Thinking...',
        sender: 'ai',
        timestamp: new Date()
      }]);

      // Capture the current frame if camera is active
      const frameDataUrl = isCameraActive ? captureFrame() : null;
      
      // Prepare context about what's visible in the camera
      const detectionSummary = detections
        .map(d => `${d.class} (confidence: ${Math.round(d.score * 100)}%)`)
        .join(', ');
      
      // Prepare unique detected classes with counts
      const uniqueObjects = Array.from(
        detections.reduce((acc, detection) => {
          const count = acc.get(detection.class) || 0;
          acc.set(detection.class, count + 1);
          return acc;
        }, new Map<string, number>())
      ).map(([name, count]) => `${name}${count > 1 ? ` (${count})` : ''}`);
      
      // Prepare detailed context about objects
      const objectsContext = detections.map(obj => {
        const [x, y, width, height] = obj.bbox;
        return `${obj.class} (confidence: ${Math.round(obj.score * 100)}%, position: x=${Math.round(x)}, y=${Math.round(y)}, width=${Math.round(width)}, height=${Math.round(height)})`;
      }).join('\n');
      
      // Build the prompt with context about what's in the camera view
      const contextPrompt = `
Current camera view contains the following objects: ${uniqueObjects.join(', ')}.

Detailed object information:
${objectsContext}

The user asked: "${userMessage.text}"

Please respond to the user's question about what's visible in the camera. Be helpful, concise, and informative. If you're unsure about something not clearly detected, you can mention that uncertainty.
      `.trim();
      
      // Send message to Gemini API
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'chat',
          content: contextPrompt,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }
      
      const data = await response.json();
      
      // Replace the "thinking" message with the actual response
      setChatHistory(prev => {
        const newHistory = prev.filter(msg => msg.text !== 'Thinking...');
        return [...newHistory, {
          text: data.response || "I'm sorry, I couldn't analyze the objects in the camera view.",
          sender: 'ai',
          timestamp: new Date()
        }];
      });
    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      
      // Replace the "thinking" message with an error message
      setChatHistory(prev => {
        const newHistory = prev.filter(msg => msg.text !== 'Thinking...');
        return [...newHistory, {
          text: "Sorry, I encountered an error while analyzing the camera view.",
          sender: 'ai',
          timestamp: new Date()
        }];
      });
    } finally {
      setIsProcessingChat(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Real-Time Object Detection with AI Chat</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Object Detection Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {isInitializing ? (
            <div className="text-center py-10">
              <p className="mb-4">Loading object detection model...</p>
              <div className="animate-spin h-10 w-10 border-4 border-indigo-500 rounded-full border-t-transparent mx-auto"></div>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg">
                  {errorMessage}
                </div>
              )}
              
              <div className="mb-4 relative rounded-lg overflow-hidden">
                {/* Video element */}
                <video
                  ref={videoRef}
                  className="w-full h-auto bg-gray-200 rounded-lg"
                  autoPlay
                  playsInline
                  muted
                />
                
                {/* Canvas overlay for drawing detections */}
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                />
                
                {/* Show placeholder when camera is inactive */}
                {!isCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 text-white">
                    <div className="text-center">
                      <p className="text-xl mb-4">Camera is not active</p>
                      <p className="text-sm mb-4">Click "Start Camera" to begin object detection</p>
                    </div>
                  </div>
                )}
                
                {/* Stats panel - FPS and detection count */}
                {isCameraActive && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm">
                    FPS: {fps} | Objects: {detections.length}
                  </div>
                )}
                
                {/* Info button */}
                <button 
                  onClick={toggleInfo}
                  className="absolute bottom-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              {/* Info panel with detected objects */}
              {showInfo && (
                <div className="mb-4 p-4 bg-gray-100 rounded-lg">
                  <h3 className="font-bold mb-2">Detected Objects:</h3>
                  {detections.length === 0 ? (
                    <p className="text-gray-500">No objects detected yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(detections.map(d => d.class))).map((objectClass) => {
                        const count = detections.filter(d => d.class === objectClass).length;
                        return (
                          <span 
                            key={objectClass} 
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                          >
                            {objectClass} ({count})
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-4 text-sm text-gray-600">
                    The COCO-SSD model can detect 80+ common objects including people, vehicles, animals, and everyday items.
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2">
                {!isCameraActive ? (
                  <button
                    onClick={startCamera}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    Start Camera
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    Stop Camera
                  </button>
                )}
                
                <Link href="/" className="inline-block">
                  <button className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                    Back to Home
                  </button>
                </Link>
              </div>
            </>
          )}
        </div>
        
        {/* Chat Interface */}
        <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col h-[500px]">
          <h2 className="text-xl font-bold mb-4">Ask about what I see</h2>
          
          {/* Chat messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto mb-4 p-2 space-y-4"
          >
            {chatHistory.map((message, index) => (
              <div
                key={index}
                className={`${
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
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Chat input */}
          <div className="border-t pt-4 mt-auto">
            <div className="flex items-center">
              {/* Voice input button */}
              <button
                onClick={toggleVoiceRecognition}
                disabled={isProcessingChat || !isCameraActive || detections.length === 0}
                className={`p-2 rounded-full mr-2 ${
                  isListening ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isListening ? "Stop listening" : "Ask with voice"}
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
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder={isListening ? "Listening..." : "Ask about objects in the camera..."}
                className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isProcessingChat || !isCameraActive || detections.length === 0 || isListening}
              />
              
              <button
                onClick={sendChatMessage}
                disabled={!chatMessage.trim() || isProcessingChat || !isCameraActive || detections.length === 0}
                className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
              >
                {isProcessingChat ? (
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
                    Thinking
                  </span>
                ) : (
                  <span>Send</span>
                )}
              </button>
            </div>
            
            {/* Voice indicator */}
            {isListening && (
              <div className="mt-2 text-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <span className="animate-pulse bg-red-400 rounded-full h-2 w-2 mr-2"></span>
                  Listening... Click the microphone again to stop and send
                </span>
              </div>
            )}
            
            {!isCameraActive && (
              <p className="mt-2 text-sm text-red-500">
                Start the camera to enable chat.
              </p>
            )}
            
            {isCameraActive && detections.length === 0 && (
              <p className="mt-2 text-sm text-red-500">
                No objects detected yet. Wait for objects to be detected.
              </p>
            )}
            
            <div className="mt-3 text-xs text-gray-500">
              <p>Try asking:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>"What do you see in the camera?"</li>
                <li>"How many people are visible?"</li>
                <li>"Describe the objects in the image"</li>
                <li>"What's the relationship between objects?"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Information section */}
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">About Object Detection with AI Chat</h2>
        <p className="mb-4">
          This demo uses TensorFlow.js with the COCO-SSD model to detect objects in real-time, and 
          integrates with Google's Gemini 1.5 Flash API to answer questions about what's visible in the camera.
        </p>
        <h3 className="font-bold mt-4 mb-2">Features:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Real-time object detection directly in your browser</li>
          <li>AI-powered chat about detected objects using Gemini</li>
          <li>Voice input for hands-free interaction</li>
          <li>Detection of 80+ common objects including people, animals, vehicles, and household items</li>
          <li>Interactive interface with performance metrics</li>
        </ul>
      </div>
    </div>
  );
} 