'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { initObjectDetection, detectObjects, drawDetections, DetectedObject } from '../utils/object-detection';

export default function ObjectDetectionPage() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detections, setDetections] = useState<DetectedObject[]>([]);
  const [fps, setFps] = useState(0);
  const [showInfo, setShowInfo] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

  // Initialize object detection model
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      try {
        const isInitialized = await initObjectDetection();
        if (!isInitialized) {
          setErrorMessage('Failed to initialize object detection model');
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

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Real-Time Object Detection</h1>
      
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
      
      {/* Information section */}
      <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">About Object Detection</h2>
        <p className="mb-4">
          This demo uses TensorFlow.js and the COCO-SSD (Common Objects in Context - Single Shot MultiBox Detector) 
          model to detect objects in real-time using your camera.
        </p>
        <h3 className="font-bold mt-4 mb-2">Detectable Objects Include:</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {['person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 
            'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 
            'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 
            'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 
            'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 
            'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 
            'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 
            'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 
            'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 
            'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'].map((item) => (
            <span key={item} className="text-sm px-2 py-1 bg-gray-100 rounded">{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
} 