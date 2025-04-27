'use client';

// Define a proper interface for FaceAPI instead of using any
interface FaceAPI {
  detectSingleFace: (input: HTMLImageElement) => any;
  detectAllFaces: (input: HTMLVideoElement) => any;
  draw: {
    drawDetections: (canvas: HTMLCanvasElement, detections: any) => void;
    DrawBox: new (box: any, options: any) => { draw: (canvas: HTMLCanvasElement) => void };
  };
  euclideanDistance: (descriptor1: Float32Array, descriptor2: Float32Array) => number;
  nets: {
    ssdMobilenetv1: { loadFromUri: (url: string) => Promise<void> };
    faceLandmark68Net: { loadFromUri: (url: string) => Promise<void> };
    faceRecognitionNet: { loadFromUri: (url: string) => Promise<void> };
  };
}

// Import dynamically to avoid server-side rendering issues
let faceapi: FaceAPI | null = null;

// Define interface for face data
interface FaceData {
  name: string;
  descriptor: number[];
  notes?: string;
  lastInteraction?: string;
}

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
export const saveFaceData = (name: string, descriptor: Float32Array, notes: string = '') => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Get existing data
    const existingData = getFaceData();
    
    // Check if we're updating an existing face
    const existingIndex = existingData.findIndex((face: FaceData) => face.name === name);
    
    if (existingIndex >= 0) {
      // Update existing face
      existingData[existingIndex] = {
        ...existingData[existingIndex],
        descriptor: Array.from(descriptor),
        notes: notes || existingData[existingIndex].notes
      };
    } else {
      // Add new face
      existingData.push({
        name,
        descriptor: Array.from(descriptor),
        notes,
        lastInteraction: new Date().toISOString()
      });
    }
    
    // Save to localStorage
    localStorage.setItem('faceData', JSON.stringify(existingData));
    return true;
  } catch (error) {
    console.error('Error saving face data:', error);
    return false;
  }
};

// Get face data from localStorage
export const getFaceData = (): FaceData[] => {
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

// Update a specific face's notes
export const updateFaceNotes = (name: string, notes: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const existingData = getFaceData();
    const personIndex = existingData.findIndex((face: FaceData) => face.name === name);
    
    if (personIndex === -1) return false;
    
    existingData[personIndex].notes = notes;
    existingData[personIndex].lastInteraction = new Date().toISOString();
    
    localStorage.setItem('faceData', JSON.stringify(existingData));
    return true;
  } catch (error) {
    console.error('Error updating face notes:', error);
    return false;
  }
};

// Save interaction with a person
export const recordInteraction = (name: string, interaction: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const existingData = getFaceData();
    const personIndex = existingData.findIndex((face: FaceData) => face.name === name);
    
    if (personIndex === -1) return false;
    
    // Get existing notes or initialize empty
    const existingNotes = existingData[personIndex].notes || '';
    
    // Add new interaction with timestamp
    const timestamp = new Date().toLocaleString();
    const newNotes = `${existingNotes}\n\n${timestamp}: ${interaction}`.trim();
    
    existingData[personIndex].notes = newNotes;
    existingData[personIndex].lastInteraction = new Date().toISOString();
    
    localStorage.setItem('faceData', JSON.stringify(existingData));
    return true;
  } catch (error) {
    console.error('Error recording interaction:', error);
    return false;
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
    
    savedFaces.forEach((face: FaceData) => {
      // Convert saved descriptor array back to Float32Array
      const savedDescriptor = new Float32Array(face.descriptor);
      
      // Calculate distance between current face and saved face
      const distance = faceapi ? faceapi.euclideanDistance(descriptor, savedDescriptor) : 1.0;
      
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

// Get notes for a specific person
export const getPersonNotes = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const savedFaces = getFaceData();
    const person = savedFaces.find((face: FaceData) => face.name === name);
    
    if (!person) return null;
    
    return person.notes || null;
  } catch (error) {
    console.error('Error getting person notes:', error);
    return null;
  }
}; 