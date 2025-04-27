'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { loadModels, processImage, saveFaceData } from '../utils/face-recognition';

export default function ImageSavePage() {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [captureMode, setCaptureMode] = useState<'upload' | 'camera'>('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showNotesField, setShowNotesField] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const initFaceAPI = async () => {
      setIsLoading(true);
      setMessage({ text: 'Loading face recognition models...', type: 'info' });
      
      try {
        const isLoaded = await loadModels();
        if (isLoaded) {
          setModelsLoaded(true);
          setMessage({ text: 'Face recognition models loaded successfully', type: 'success' });
        } else {
          setMessage({ text: 'Failed to load face recognition models', type: 'error' });
        }
      } catch (error) {
        console.error('Error initializing face API:', error);
        setMessage({ text: 'Error initializing face recognition', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    // Initialize only in browser environment
    if (typeof window !== 'undefined') {
      initFaceAPI();
    }

    // Cleanup function to stop camera when component unmounts
    return () => {
      stopCamera();
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    stopCamera(); // Stop camera if it's active
    setCaptureMode('upload');
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageSrc(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const startCamera = async () => {
    // Clear any existing image
    setImageSrc(null);
    setCaptureMode('camera');
    
    if (!videoRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setIsCameraActive(true);
      
      if (message?.type === 'error' && message.text.includes('camera')) {
        setMessage(null);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setMessage({ 
        text: 'Could not access camera. Please check permissions or use the upload option.', 
        type: 'error' 
      });
      setCaptureMode('upload');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
    
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const videoWidth = videoRef.current.videoWidth;
    const videoHeight = videoRef.current.videoHeight;
    
    // Set canvas dimensions to match video
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;
    
    // Draw current video frame to canvas
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
      
      // Convert canvas to data URL and set as image source
      const imageSrc = canvasRef.current.toDataURL('image/png');
      setImageSrc(imageSrc);
      
      // Stop camera after capture
      stopCamera();
    }
  };

  const handleSave = async () => {
    if (!name || !imageSrc || !imageRef.current || !modelsLoaded) {
      setMessage({ text: 'Please provide a name and upload/capture an image', type: 'error' });
      return;
    }

    setIsLoading(true);
    setMessage({ text: 'Processing image...', type: 'info' });
    
    try {
      const detection = await processImage(imageRef.current);
      
      if (!detection) {
        setMessage({ text: 'No face detected in the image. Please try a different image.', type: 'error' });
        setIsLoading(false);
        return;
      }
      
      const faceDescriptor = detection.descriptor;
      const result = saveFaceData(name, faceDescriptor, notes);
      
      if (result) {
        setMessage({ text: `Face data for ${name} saved successfully!`, type: 'success' });
        // Reset form
        setName('');
        setNotes('');
        setImageSrc(null);
        setShowNotesField(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setMessage({ text: 'Failed to save face data', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving face:', error);
      setMessage({ text: 'Error processing image', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Save Face Image</h1>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
            Person's Name:
          </label>
          <input
            type="text"
            id="name"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Enter name"
            value={name}
            onChange={handleNameChange}
            disabled={isLoading}
          />
        </div>

        {/* Notes toggle checkbox */}
        <div className="mb-4">
          <div className="flex items-center">
            <input
              id="show-notes"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              checked={showNotesField}
              onChange={(e) => setShowNotesField(e.target.checked)}
              disabled={isLoading}
            />
            <label htmlFor="show-notes" className="ml-2 block text-sm text-gray-700">
              Add notes about this person (optional)
            </label>
          </div>
        </div>

        {/* Notes textarea (only visible when showNotesField is true) */}
        {showNotesField && (
          <div className="mb-4">
            <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-2">
              Notes:
            </label>
            <textarea
              id="notes"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Add some notes or information about this person that you want to remember"
              rows={4}
              value={notes}
              onChange={handleNotesChange}
              disabled={isLoading}
            />
            <p className="mt-1 text-sm text-gray-500">
              These notes will be available when chatting about this person in the future.
            </p>
          </div>
        )}

        {/* Capture mode toggle */}
        <div className="mb-4">
          <div className="flex border rounded-md overflow-hidden">
            <button
              onClick={() => {
                stopCamera();
                setCaptureMode('upload');
              }}
              className={`flex-1 py-2 ${
                captureMode === 'upload'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upload Photo
            </button>
            <button
              onClick={startCamera}
              className={`flex-1 py-2 ${
                captureMode === 'camera'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Use Camera
            </button>
          </div>
        </div>

        {/* Upload area (visible in upload mode) */}
        {captureMode === 'upload' && (
          <div className="mb-4">
            <label htmlFor="image" className="block text-gray-700 text-sm font-bold mb-2">
              Upload Photo:
            </label>
            <input
              ref={fileInputRef}
              type="file"
              id="image"
              accept="image/*"
              className="w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Camera preview (visible in camera mode) */}
        {captureMode === 'camera' && (
          <div className="mb-4">
            <p className="block text-gray-700 text-sm font-bold mb-2">
              {isCameraActive ? 'Camera Preview:' : 'Camera not active'}
            </p>
            <div className="border border-gray-300 rounded-lg p-2 bg-gray-100">
              <video
                ref={videoRef}
                className="w-full h-auto rounded-lg"
                autoPlay
                playsInline
                muted
                style={{ display: isCameraActive ? 'block' : 'none' }}
              />
              {!isCameraActive && (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-gray-500">Camera is not active</p>
                </div>
              )}
            </div>
            {isCameraActive && (
              <button
                onClick={capturePhoto}
                disabled={isLoading}
                className="mt-2 w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
              >
                Capture Photo
              </button>
            )}
            {/* Hidden canvas for capturing video frame */}
            <canvas ref={canvasRef} className="hidden"></canvas>
          </div>
        )}

        {/* Image preview (visible when an image is captured or uploaded) */}
        {imageSrc && (
          <div className="mb-4">
            <p className="text-gray-700 text-sm font-bold mb-2">Preview:</p>
            <div className="border border-gray-300 rounded-lg p-2 flex justify-center">
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Face preview"
                className="max-h-64 object-contain"
                crossOrigin="anonymous"
              />
            </div>
          </div>
        )}

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' :
            message.type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2">
          <button
            onClick={handleSave}
            disabled={isLoading || !modelsLoaded || !imageSrc || !name}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Save Face'}
          </button>
          
          <Link href="/live-camera" className="inline-block">
            <button className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              Go to Live Camera
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
} 