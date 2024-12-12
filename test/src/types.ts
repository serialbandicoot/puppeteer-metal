export interface XYCoords {
    x: number;
    y: number;
}

// Define the structure for the image
export interface Image {
    width: number;
    height: number;
  }
  
  // Define the structure for the individual predictions
  export interface AuthPrediction {
    width: number;
    height: number;
    x: number;
    y: number;
    confidence: number;
    class_id: number;
    class: string;
    detection_id: string;
    parent_id: string;
  }
  
  // Define the structure for the model predictions
  export interface ModelPredictions {
    inference_id: string;
    predictions: {
      image: Image;
      predictions: AuthPrediction[];
    };
  }
  
  // Define the structure for video metadata
  export interface VideoMetadata {
    video_identifier: string;
    frame_number: number;
    frame_timestamp: string;
    fps: number;
    measured_fps: number | null;
    comes_from_video_file: boolean | null;
  }
  
  // Define the structure for bounding box visualization
  export interface BoundingBoxVisualization {
    type: string;
    value: string;
    video_metadata: VideoMetadata;
  }
  
  // Define the structure for the classification predictions in model_1
  export interface ClassificationPrediction {
    class: string;
    class_id: number;
    confidence: number;
  }
  
  // Define the structure for the predictions from model_1
  export interface Model1Prediction {
    inference_id: string;
    predictions: {
      inference_id: string;
      time: number;
      image: Image;
      predictions: ClassificationPrediction[];
      top: string;
      confidence: number;
      prediction_type: string;
      parent_id: string;
      root_parent_id: string;
    };
    result: string;
  }
  
  // Define the final structure for the entire response
  export interface PredictionResult {
    model_predictions: ModelPredictions;
    bounding_box_visualization: BoundingBoxVisualization;
    model_1: Model1Prediction[];
  }
  
  // Text
  export interface TextPredictionResult {
    text: string;
    label: string;
    probability: number;
}

export interface TablePrediction {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TablePredictionResult {
  predictions: TablePrediction[];
}