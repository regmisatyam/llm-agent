'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { loadModels, getFaceData, recognizeFace, getPersonNotes, recordInteraction } from '../utils/face-recognition';
import { VoiceRecognition } from '../utils/voice-recognition';

// Import faceapi dynamically to avoid SSR issues
let faceapi: any = null;

export default function LiveCameraPage() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedName, setDetectedName] = useState<string | null>(null);
  const [detectedNotes, setDetectedNotes] = useState<string | null>(null);
  const [savedFaces, setSavedFaces] = useState<{name: string}[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [isProcessingChat, setIsProcessingChat] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatHistory, setChatHistory] = useState<{text: string, sender: 'user' | 'ai', timestamp: Date}[]>([
    {
      text: "Hello! I can tell you about the faces I recognize. Try asking me something like 'Who do you see?' or 'Tell me about the person in front of the camera.'",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const voiceRecognitionRef = useRef<VoiceRecognition | null>(null);

  // Initialize face models and check for saved faces
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      try {
        // Import faceapi library dynamically
        if (!faceapi) {
          try {
            faceapi = await import('@vladmandic/face-api');
          } catch (error) {
            console.error('Error importing face-api:', error);
            setErrorMessage('Failed to import face recognition library');
            setIsInitializing(false);
            return;
          }
        }

        // Load face recognition models
        const isLoaded = await loadModels();
        if (!isLoaded) {
          setErrorMessage('Failed to load face recognition models');
          setIsInitializing(false);
          return;
        }

        // Check if there are any saved faces
        const faces = getFaceData();
        setSavedFaces(faces.map((face: { name: string }) => ({ name: face.name })));
        
        if (faces.length === 0) {
          setErrorMessage('No saved faces found. Please save a face first.');
        }
        
        // Initialize voice recognition
        if (typeof window !== 'undefined') {
          voiceRecognitionRef.current = new VoiceRecognition();
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setErrorMessage('Failed to initialize face recognition');
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      stopCamera();
      stopVoiceRecognition();
    };
  }, []);
  
  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Add a new useEffect to send an automatic introductory message when a person is recognized
  useEffect(() => {
    // Only trigger when a name is newly detected (not Unknown) and camera is active
    if (detectedName && detectedName !== 'Unknown' && isCameraActive && !isProcessingChat) {
      // Add an AI message introducing the person
      const notesSummary = detectedNotes 
        ? ` ` 
        : '';
        
      setChatHistory(prev => {
        // Check if the last message was already an introduction for this person
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && 
            lastMsg.sender === 'ai' && 
            lastMsg.text.includes(`I recognize this person as ${detectedName}`)) {
          return prev; // Don't add duplicate introductions
        }
        
        return [...prev, {
          text: `I recognize this person as ${detectedName}.${notesSummary}`,
          sender: 'ai',
          timestamp: new Date()
        }];
      });
    }
  }, [detectedName, detectedNotes, isCameraActive, isProcessingChat]);

  const startCamera = async () => {
    if (!videoRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setIsCameraActive(true);
      setErrorMessage(null);
      
      // Start face detection loop
      startFaceDetection();
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
    setDetectedName(null);
  };

  const startFaceDetection = () => {
    if (!videoRef.current || !canvasRef.current || !faceapi) return;
    
    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || !streamRef.current || !faceapi) return;
      
      // Only attempt detection if video is playing and has dimensions
      if (videoRef.current.paused || videoRef.current.ended || !videoRef.current.videoWidth) return;
      
      // Resize canvas to match video dimensions
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;
      
      try {
        // Detect faces in current video frame
        const detections = await faceapi.detectAllFaces(videoRef.current)
          .withFaceLandmarks()
          .withFaceDescriptors();
        
        // Clear canvas and update with new detections
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, videoWidth, videoHeight);
          
          // Process each detected face
          if (detections.length > 0) {
            // For simplicity, just use the first face if multiple are detected
            const faceDescriptor = detections[0].descriptor;
            const name = await recognizeFace(faceDescriptor);
            setDetectedName(name);
            
            // If we have a recognized person (not unknown), get their notes
            if (name && name !== 'Unknown') {
              const notes = getPersonNotes(name);
              setDetectedNotes(notes);
              
              // Log the recognition for debugging
              console.log(`Recognized ${name}, notes:`, notes);
            } else {
              setDetectedNotes(null);
            }
            
            // Draw boxes around faces with labels
            faceapi.draw.drawDetections(canvasRef.current, detections);
            
            // Draw name label
            const drawBox = new faceapi.draw.DrawBox(detections[0].detection.box, {
              label: name,
              boxColor: name !== 'Unknown' ? 'green' : 'red',
              drawLabelOptions: {
                fontSize: 20,
                fontStyle: 'bold',
                fontColor: name !== 'Unknown' ? 'green' : 'red'
              }
            });
            drawBox.draw(canvasRef.current);
          } else {
            setDetectedName(null);
            setDetectedNotes(null);
          }
        }
      } catch (error) {
        console.error('Error during face detection:', error);
      }
    }, 100); // Check for faces every 100ms
  };
  
  // Toggle voice recognition
  const toggleVoiceRecognition = () => {
    if (isProcessingChat || !isCameraActive) return;
    
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
  
  // Send a message to Gemini API about the recognized faces
  const sendChatMessage = async () => {
    if (!chatMessage.trim() || isProcessingChat || !isCameraActive) return;
    
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
      setChatHistory(prev => [...prev, {
        text: 'Thinking...',
        sender: 'ai',
        timestamp: new Date()
      }]);

      // Capture the current frame if camera is active
      const frameDataUrl = isCameraActive ? captureFrame() : null;
      
      // Build the prompt with context about recognized faces
      let contextPrompt = `The camera currently`;
      
      if (detectedName) {
        if (detectedName === 'Unknown') {
          contextPrompt += ` shows a person that I don't recognize (labeled as "Unknown").`;
        } else {
          contextPrompt += ` shows a person I recognize as "${detectedName}".`;
          
          // Add notes if available with more detailed formatting
          if (detectedNotes) {
            contextPrompt += `\n\nHere's what I know about ${detectedName}:\n${detectedNotes}`;
            contextPrompt += `\n\nPlease use this information when responding to questions about ${detectedName} or about past interactions.`;
          } else {
            contextPrompt += `\n\nI don't have any saved information or past conversation history with ${detectedName} yet.`;
          }
        }
      } else {
        contextPrompt += ` is not detecting any faces at the moment.`;
      }
      
      contextPrompt += `\n\nAvailable saved faces in the system: ${savedFaces.map(face => face.name).join(', ')}.`;
      
      contextPrompt += `\n\nThe user asked: "${userMessage.text}"`;
      
      contextPrompt += `\n\nPlease respond to the user's question about face recognition. Be helpful, concise, and informative. If the user is asking about previous conversations, refer to the notes. If no face is detected or the face is unknown, you can mention that as appropriate.`;
      
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
          text: data.response || "I'm sorry, I couldn't analyze the face recognition results.",
          sender: 'ai',
          timestamp: new Date()
        }];
      });
      
      // If we have a recognized person, record this interaction in their notes
      if (detectedName && detectedName !== 'Unknown') {
        recordInteraction(detectedName, `User: ${userMessage.text}\nAI: ${data.response}`);
      }
    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      
      // Replace the "thinking" message with an error message
      setChatHistory(prev => {
        const newHistory = prev.filter(msg => msg.text !== 'Thinking...');
        return [...newHistory, {
          text: "Sorry, I encountered an error while analyzing the face recognition results.",
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
      <h1 className="text-2xl font-bold mb-6">Live Face Recognition with AI Chat</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Face Recognition Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {isInitializing ? (
            <div className="text-center py-10">
              <p className="mb-4">Loading face recognition models...</p>
              <div className="animate-spin h-10 w-10 border-4 border-indigo-500 rounded-full border-t-transparent mx-auto"></div>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg">
                  {errorMessage}
                </div>
              )}
              
              {savedFaces.length === 0 ? (
                <div className="mb-4 p-4 bg-yellow-100 text-yellow-800 rounded-lg text-center">
                  <p className="mb-2">No faces have been saved yet.</p>
                  <Link href="/image-save" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
                    Go to Save Face
                  </Link>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-gray-700 font-medium mb-2">Saved Faces ({savedFaces.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {savedFaces.map((face, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {face.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mb-4 relative">
                <video
                  ref={videoRef}
                  className="w-full h-auto bg-gray-200 rounded-lg"
                  autoPlay
                  playsInline
                  muted
                  style={{ display: isCameraActive ? 'block' : 'none' }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ display: isCameraActive ? 'block' : 'none' }}
                />
                
                {!isCameraActive && (
                  <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                    <p className="text-gray-500">Camera is not active</p>
                  </div>
                )}
                
                {detectedName && (
                  <div className={`mt-2 text-center p-2 rounded-lg ${detectedName === 'Unknown' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    <p className="font-bold">{detectedName === 'Unknown' ? 'Unknown Person' : `Hello, ${detectedName}!`}</p>
                    {detectedName !== 'Unknown' && detectedNotes && (
                      <div className="mt-2 text-sm max-h-20 overflow-y-auto">
                        <p className="font-medium">Notes available:</p>
                        <button 
                          onClick={() => {
                            const question = `Tell me about ${detectedName}`;
                            // First add the user message to chat
                            const userMessage = {
                              text: question,
                              sender: 'user' as const,
                              timestamp: new Date()
                            };
                            setChatHistory(prev => [...prev, userMessage]);
                            
                            // Then process it with Gemini (using a timeout to ensure state updates first)
                            setTimeout(() => {
                              // We have to do this instead of using sendChatMessage directly
                              // because setChatMessage alone won't trigger the API call
                              setChatMessage(question);
                              // Create a temporary copy of chatMessage
                              const tempMessage = question;
                              setChatMessage('');
                              setIsProcessingChat(true);
                              
                              // Now call the sendChatMessage logic with our temporary message
                              (async () => {
                                try {
                                  // Add a "thinking" message
                                  setChatHistory(prev => [...prev, {
                                    text: 'Thinking...',
                                    sender: 'ai',
                                    timestamp: new Date()
                                  }]);
                                  
                                  // Build the prompt with context about recognized faces
                                  let contextPrompt = `The camera currently`;
                                  
                                  if (detectedName) {
                                    if (detectedName === 'Unknown') {
                                      contextPrompt += ` shows a person that I don't recognize (labeled as "Unknown").`;
                                    } else {
                                      contextPrompt += ` shows a person I recognize as "${detectedName}".`;
                                      
                                      // Add notes if available with more detailed formatting
                                      if (detectedNotes) {
                                        contextPrompt += `\n\nHere's what I know about ${detectedName}:\n${detectedNotes}`;
                                        contextPrompt += `\n\nPlease use this information when responding to questions about ${detectedName} or about past interactions.`;
                                      } else {
                                        contextPrompt += `\n\nI don't have any saved information or past conversation history with ${detectedName} yet.`;
                                      }
                                    }
                                  } else {
                                    contextPrompt += ` is not detecting any faces at the moment.`;
                                  }
                                  
                                  contextPrompt += `\n\nAvailable saved faces in the system: ${savedFaces.map(face => face.name).join(', ')}.`;
                                  
                                  contextPrompt += `\n\nThe user asked: "${tempMessage}"`;
                                  
                                  contextPrompt += `\n\nPlease respond to the user's question about face recognition. Be helpful, concise, and informative. If the user is asking about previous conversations, refer to the notes. If no face is detected or the face is unknown, you can mention that as appropriate.`;
                                  
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
                                      text: data.response || "I'm sorry, I couldn't analyze the face recognition results.",
                                      sender: 'ai',
                                      timestamp: new Date()
                                    }];
                                  });
                                  
                                  // Record this interaction
                                  if (detectedName && detectedName !== 'Unknown') {
                                    recordInteraction(detectedName, `User: ${tempMessage}\nAI: ${data.response}`);
                                  }
                                } catch (error) {
                                  console.error('Error sending message to Gemini:', error);
                                  
                                  // Replace the "thinking" message with an error message
                                  setChatHistory(prev => {
                                    const newHistory = prev.filter(msg => msg.text !== 'Thinking...');
                                    return [...newHistory, {
                                      text: "Sorry, I encountered an error while analyzing the face recognition results.",
                                      sender: 'ai',
                                      timestamp: new Date()
                                    }];
                                  });
                                } finally {
                                  setIsProcessingChat(false);
                                }
                              })();
                            }, 100);
                          }}
                          className="mt-1 text-xs underline text-indigo-600 hover:text-indigo-800"
                        >
                          Ask about this person
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2">
                {!isCameraActive ? (
                  <button
                    onClick={startCamera}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    disabled={savedFaces.length === 0}
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
                
                <Link href="/image-save" className="inline-block">
                  <button className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                    Manage Saved Faces
                  </button>
                </Link>
              </div>
            </>
          )}
        </div>
        
        {/* Chat Interface */}
        <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col h-[500px]">
          <h2 className="text-xl font-bold mb-4">Ask about who I see</h2>
          
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
                disabled={isProcessingChat || !isCameraActive}
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
                placeholder={isListening ? "Listening..." : "Ask about faces in the camera..."}
                className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isProcessingChat || !isCameraActive || isListening}
              />
              
              <button
                onClick={sendChatMessage}
                disabled={!chatMessage.trim() || isProcessingChat || !isCameraActive}
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
            
            <div className="mt-3 text-xs text-gray-500">
              <p>Try asking:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>"Who do you see in the camera?"</li>
                <li>"Is there anyone you recognize?"</li>
                <li>"Tell me about the person you're seeing"</li>
                <li>"What was our last conversation about?"</li>
                <li>"Do you have any notes about this person?"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Information section */}
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">About Face Recognition with AI Chat</h2>
        <p className="mb-4">
          This demo uses face-api.js to recognize faces in real-time, and 
          integrates with Google's Gemini 1.5 Flash API to answer questions about who's being detected.
        </p>
        <h3 className="font-bold mt-4 mb-2">Features:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Real-time face recognition directly in your browser</li>
          <li>AI-powered chat about recognized faces using Gemini</li>
          <li>Voice input for hands-free interaction</li>
          <li>Recognize faces that you've previously registered</li>
          <li>Save and retrieve notes about people for personalized conversations</li>
          <li>Simple interface with clear visual feedback</li>
        </ul>
      </div>
    </div>
  );
} 