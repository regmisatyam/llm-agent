'use client';

// Import dynamically to avoid server-side rendering issues
let faceapi: any = null;

// Initialize face-api models
export const loadModels = async () => {
  // Only import faceapi on the client side
  if (typeof window !== 'undefined' && !faceapi) {
    try {
      faceapi = await import('@vladmandic/face-api');
    } catch (error) {
      console.error('Error importing face-api:', error);
      return false;
    }
  }

  if (!faceapi) {
    console.error('Face API not available');
    return false;
  }

  const MODEL_URL = '/models';
  
  try {
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    console.log('Models loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading models:', error);
    return false;
  }
};

// Process an image for face detection and recognition
export const processImage = async (imageElement: HTMLImageElement) => {
  if (!faceapi) {
    try {
      faceapi = await import('@vladmandic/face-api');
    } catch (error) {
      console.error('Error importing face-api:', error);
      return null;
    }
  }

  try {
    // Detect all faces in the image with landmarks and descriptors
    const detections = await faceapi.detectSingleFace(imageElement)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) {
      console.log('No face detected in image');
      return null;
    }

    return detections;
  } catch (error) {
    console.error('Error processing image:', error);
    return null;
  }
};

// Save face data to localStorage
export const saveFaceData = (name: string, descriptor: Float32Array) => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Get existing data
    const existingData = getFaceData();
    
    // Add new face
    existingData.push({ name, descriptor: Array.from(descriptor) });
    
    // Save to localStorage
    localStorage.setItem('faceData', JSON.stringify(existingData));
    return true;
  } catch (error) {
    console.error('Error saving face data:', error);
    return false;
  }
};

// Get face data from localStorage
export const getFaceData = () => {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem('faceData');
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error retrieving face data:', error);
    return [];
  }
};

// Recognize face by comparing descriptors
export const recognizeFace = async (descriptor: Float32Array, threshold = 0.5) => {
  if (!faceapi) {
    try {
      faceapi = await import('@vladmandic/face-api');
    } catch (error) {
      console.error('Error importing face-api:', error);
      return 'Unknown';
    }
  }

  try {
    const savedFaces = getFaceData();
    
    if (savedFaces.length === 0) {
      return null;
    }
    
    let bestMatch = { name: 'Unknown', distance: 1.0 };
    
    savedFaces.forEach((face: { name: string; descriptor: number[] }) => {
      // Convert saved descriptor array back to Float32Array
      const savedDescriptor = new Float32Array(face.descriptor);
      
      // Calculate distance between current face and saved face
      const distance = faceapi.euclideanDistance(descriptor, savedDescriptor);
      
      // Update best match if this distance is smaller
      if (distance < bestMatch.distance) {
        bestMatch = { name: face.name, distance };
      }
    });
    
    // Return match only if it's below threshold (more similar = lower distance)
    return bestMatch.distance <= threshold ? bestMatch.name : 'Unknown';
  } catch (error) {
    console.error('Error during face recognition:', error);
    return 'Unknown';
  }
}; 