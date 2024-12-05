import { AuthPrediction, Model1Prediction, ModelPredictions, PredictionResult, TextPredictionResult, XYCoords } from "./types";

export class Prediction {
    constructor(readonly fileName: string) {}


    async getFormPrediction(text: string[]): Promise<TextPredictionResult[]> {
        // Join the array into a single string with double pipes (||) as the delimiter
        const joinedText = text.join("||");
    
        // Encode the joined string in Base64
        const phrase = Buffer.from(joinedText).toString("base64");
    
        // Construct the API URL
        const url = `http://127.0.0.1:5000/infer_text?texts=${phrase}`;
    
        try {
            // Send the GET request to the server
            const response = await fetch(url);
    
            // Handle potential errors in the response
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch predictions. Status: ${response.status}, Message: ${response.statusText}`
                );
            }
    
            // Parse the JSON response
            const jsonData = await response.json();
    
            // Validate the JSON response structure
            if (!jsonData || !Array.isArray(jsonData)) {
                throw new Error("Unexpected response structure from the server");
            }
    
            // Log and return the predictions as typed data
            console.log("Predictions received:", jsonData);
            return jsonData as TextPredictionResult[];
        } catch (error) {
            console.error("Error fetching form predictions:", error);
            throw error; // Re-throw the error for further handling
        }
    }

    // Fetches prediction data from the inference API
    async getPredictions(model: "form-segmentation" | "auth-detection"): Promise<PredictionResult[]> {
        // Encode the file path as Base64
        const base64FilePath = Buffer.from(this.fileName).toString('base64');
        
        // Construct the URL with the query parameter
        const url = `http://127.0.0.1:5000/infer?image_file_path=${base64FilePath}&workflow_id=${model}`;
    
        try {
            const response = await fetch(url);
    
            // Handle potential errors
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch predictions for file: ${this.fileName}. Status: ${response.status}, Message: ${response.statusText}`
                );
            }
    
            const jsonData = await response.json();
            
            // Validate the JSON response structure
            if (!jsonData || !Array.isArray(jsonData)) {
                throw new Error("Unexpected response structure from the server");
            }
    
            console.log(jsonData);
    
            // Returning the predictions as typed data
            return jsonData as PredictionResult[];
        } catch (error) {
            console.error("Error during prediction fetch:", error);
            throw new Error("Failed to fetch predictions. Ensure the server is running and reachable.");
        }
    }

    getPredictionByClass(modelPredictions: ModelPredictions, className: string) {
        const predictions = modelPredictions.predictions.predictions;

        const results: { prediction: AuthPrediction; index: number }[] = [];
        predictions.forEach((prediction, index) => {
            if(prediction.class === className) {
                results.push({
                    prediction,
                    index
                });
            }
        });

        return results
    }

    getMatchingIndex(predictionsResult: PredictionResult[], className: string) {
        const model1Predictions = predictionsResult[0].model_1;
    
        for (let index = 0; index < model1Predictions.length; index++) {
            const prediction = model1Predictions[index];
            if (prediction.predictions.top === className) {
                return predictionsResult[0].model_predictions.predictions.predictions[index];
            }
        }
    
        throw new Error(`No matching class found for: ${className}`);
    }

    getPredictionByLabel(predictionsResult: PredictionResult[], className: string) {
        if(predictionsResult.length === 0) {
            throw new Error("No predictions found.");
        }
        
        if (!predictionsResult[0].model_predictions || 
            !predictionsResult[0].model_predictions.predictions || 
            !predictionsResult[0].model_predictions.predictions.predictions ||
            predictionsResult[0].model_predictions.predictions.predictions.length === 0) {
            throw new Error("No predictions found.");
        }

        const detectionPredictions = predictionsResult[0].model_predictions.predictions.predictions;
        let result = this.getPredictionByClass({ predictions: { predictions: detectionPredictions } } as ModelPredictions, className);

        // Classification
        if(result.length === 0) {
            // Get Highest Single Classifier
            // Ignore the Object Detection
            // and classify the image
            const matchingIndex = this.getMatchingIndex(predictionsResult, className);
            return {
                x: matchingIndex.x,
                y: matchingIndex.y
            } as XYCoords;
        } else {
            const topPredictions = predictionsResult[0].model_1[result[0].index].predictions.top;
            if (result[0].prediction && result[0].prediction.class === className && topPredictions === className) {
                return {
                    x: result[0].prediction.x,
                    y: result[0].prediction.y
                } as XYCoords;
            } else {
                // Default to Object Detection
                return {
                    x: result[0].prediction.x,
                    y: result[0].prediction.y
                } as XYCoords;
            }
            
        };
        
        
    }

    // Get the first prediction's x, y coordinates
    async getFirstXY(predictions: PredictionResult[], targetClass: string): Promise<XYCoords> {
        if (predictions.length === 0) {
            throw new Error("No predictions found.");
        }
    
        // Iterate over predictions
        for (let i = 0; i < predictions.length; i++) {
            const prediction = predictions[i];
    
            // Iterate through all the individual predictions in model_predictions.predictions.predictions
            for (let j = 0; j < prediction.model_predictions.predictions.predictions.length; j++) {
                const modelPrediction = prediction.model_predictions.predictions.predictions[j];
    
                // Check if the class matches the targetClass
                if (modelPrediction.class === targetClass) {
                    // Check if the top in model_1 matches the target class at the same position
                    if (prediction.model_1[j].predictions.top === targetClass) {
                        // Return XYCoords if both match
                        const coords: XYCoords = {
                            x: modelPrediction.x,
                            y: modelPrediction.y,
                        };
                        return coords;
                    } else {
                        throw new Error(`Top values do not match for the target class at index ${j}.`);
                    }
                }
            }
        }
    
        // Throw an error if no match is found
        throw new Error(`No matching class found for: ${targetClass}`);
    }
}