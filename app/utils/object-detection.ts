'use client';

// Define proper interfaces instead of using 'any'
interface DetectionObject {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

interface ObjectDetectionModel {
  detect: (input: HTMLVideoElement | HTMLImageElement) => Promise<DetectionObject[]>;
}

interface TensorFlow {
  ready: () => Promise<void>;
  loadGraphModel: (url: string) => Promise<ObjectDetectionModel>;
}

// Use proper typing for tensorflow and model
let tf: TensorFlow | null = null;
let model: ObjectDetectionModel | null = null;

// Define the interface for detected objects
export interface DetectedObject {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  score: number;
}

/**
 * Initialize the TensorFlow.js and COCO-SSD model
 */
export const initObjectDetection = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Import TensorFlow.js dynamically
    if (!tf) {
      const tensorflow = await import('@tensorflow/tfjs');
      tf = tensorflow as unknown as TensorFlow;
      await tf.ready();
    }
    
    // Load COCO-SSD model (if not already loaded)
    if (!model) {
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      model = await cocoSsd.load();
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing object detection:', error);
    return false;
  }
};

/**
 * Detect objects in an image or video frame
 */
export const detectObjects = async (
  videoElement: HTMLVideoElement | HTMLImageElement
): Promise<DetectedObject[]> => {
  if (!model) {
    console.error('Object detection model not initialized');
    return [];
  }
  
  try {
    // Perform detection
    const predictions = await model.detect(videoElement);
    
    // Convert and map predictions to our DetectedObject interface
    return predictions.map(prediction => ({
      bbox: prediction.bbox as [number, number, number, number],
      class: prediction.class,
      score: prediction.score
    }));
  } catch (error) {
    console.error('Error detecting objects:', error);
    return [];
  }
};

/**
 * Draw bounding boxes and labels for detected objects on a canvas
 */
export const drawDetections = (
  canvas: HTMLCanvasElement,
  detections: DetectedObject[],
  dimensions: { width: number, height: number }
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Set styling
  ctx.lineWidth = 3;
  ctx.font = '16px sans-serif';
  ctx.textBaseline = 'top';
  
  detections.forEach(detection => {
    const [x, y, width, height] = detection.bbox;
    const score = Math.round(detection.score * 100);
    
    // Choose color based on confidence
    let color = 'red';
    if (score > 90) color = 'limegreen';
    else if (score > 75) color = 'gold';
    else if (score > 50) color = 'orange';
    
    // Draw bounding box
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.stroke();
    
    // Draw label background
    const textWidth = ctx.measureText(`${detection.class} ${score}%`).width;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, textWidth + 10, 24);
    
    // Draw label text
    ctx.fillStyle = 'white';
    ctx.fillText(`${detection.class} ${score}%`, x + 5, y + 4);
  });
}; 