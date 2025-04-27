'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { loadModels, processImage, saveFaceData } from '../utils/face-recognition';

export default function ImageSavePage() {
  const [name, setName] = useState('');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSave = async () => {
    if (!name || !imageSrc || !imageRef.current || !modelsLoaded) {
      setMessage({ text: 'Please provide a name and upload an image', type: 'error' });
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
      const result = saveFaceData(name, faceDescriptor);
      
      if (result) {
        setMessage({ text: `Face data for ${name} saved successfully!`, type: 'success' });
        // Reset form
        setName('');
        setImageSrc(null);
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