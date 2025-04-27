'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { loadModels, getFaceData, recognizeFace } from '../utils/face-recognition';

// Import faceapi dynamically to avoid SSR issues
let faceapi: any = null;

export default function LiveCameraPage() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectedName, setDetectedName] = useState<string | null>(null);
  const [savedFaces, setSavedFaces] = useState<{name: string}[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
        setSavedFaces(faces.map(face => ({ name: face.name })));
        
        if (faces.length === 0) {
          setErrorMessage('No saved faces found. Please save a face first.');
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
    };
  }, []);

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
          }
        }
      } catch (error) {
        console.error('Error during face detection:', error);
      }
    }, 100); // Check for faces every 100ms
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Live Face Recognition</h1>
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
    </div>
  );
} 