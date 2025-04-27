'use client';

// Use dynamic imports for TensorFlow and COCO-SSD to avoid SSR issues
let tf: any = null;
let cocoSsd: any = null;
let model: any = null;

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
    // Dynamically import TensorFlow.js and COCO-SSD
    if (!tf) {
      tf = await import('@tensorflow/tfjs');
      await tf.ready();
      console.log('TensorFlow.js loaded:', tf.version.tfjs);
    }
    
    if (!cocoSsd) {
      cocoSsd = await import('@tensorflow-models/coco-ssd');
    }
    
    // Load the COCO-SSD model if not already loaded
    if (!model) {
      console.log('Loading COCO-SSD model...');
      model = await cocoSsd.load();
      console.log('COCO-SSD model loaded');
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
  element: HTMLImageElement | HTMLVideoElement
): Promise<DetectedObject[]> => {
  if (!model) {
    try {
      const initialized = await initObjectDetection();
      if (!initialized) {
        console.error('Failed to initialize object detection');
        return [];
      }
    } catch (error) {
      console.error('Error during model initialization:', error);
      return [];
    }
  }

  try {
    // Run object detection
    const predictions = await model.detect(element);
    return predictions as DetectedObject[];
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
  videoDimensions?: { width: number; height: number }
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw each detected object
  detections.forEach(detection => {
    const [x, y, width, height] = detection.bbox;
    const score = Math.round(detection.score * 100);
    const label = `${detection.class} (${score}%)`;
    
    // Calculate coordinates based on video dimensions if provided
    const scaleX = videoDimensions ? canvas.width / videoDimensions.width : 1;
    const scaleY = videoDimensions ? canvas.height / videoDimensions.height : 1;
    
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;
    const scaledWidth = width * scaleX;
    const scaledHeight = height * scaleY;
    
    // Choose color based on confidence score
    const colorMap: Record<string, string> = {
      person: '#FF0000',      // Red
      dog: '#00FF00',         // Green
      cat: '#0000FF',         // Blue
      car: '#FFFF00',         // Yellow
      bicycle: '#FF00FF',     // Magenta
      book: '#00FFFF',        // Cyan
    };
    
    // Default color based on confidence
    let color = '#30c4c9';  // Default color (teal)
    if (detection.score > 0.8) color = '#22c55e';  // High confidence (green)
    else if (detection.score < 0.6) color = '#f97316';  // Low confidence (orange)
    
    // Use object-specific color if available
    if (detection.class in colorMap) {
      color = colorMap[detection.class];
    }
    
    // Draw rectangle around object
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
    
    // Draw background for label
    ctx.fillStyle = color;
    const textMetrics = ctx.measureText(label);
    const textHeight = 20;  // Approximate height
    ctx.fillRect(
      scaledX - 1, 
      scaledY - textHeight - 4, 
      textMetrics.width + 8, 
      textHeight
    );
    
    // Draw label text
    ctx.fillStyle = '#FFFFFF';  // White text
    ctx.font = '14px Arial';
    ctx.fillText(label, scaledX + 4, scaledY - 8);
  });
}; 