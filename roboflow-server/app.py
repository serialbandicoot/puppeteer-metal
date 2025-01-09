import os
from flask import Flask, request, jsonify
import base64
from flask import Flask, jsonify
from inference_sdk import InferenceHTTPClient, InferenceConfiguration
import joblib
import pandas as pd
from tatr import TableAnalyzer
from io import BytesIO
from PIL import Image
import traceback

table_analyzer = TableAnalyzer() 
custom_configuration = InferenceConfiguration(confidence_threshold=0.1)

app = Flask(__name__)

client = InferenceHTTPClient(
    api_url="http://localhost:9001", # use local inference server
    api_key="QWERTYUIOP"
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "classification_model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "vectorizer.pkl")

# Load the saved model and vectorizer
model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VECTORIZER_PATH)

@app.route('/infer_text', methods=['GET'])
def infer_text():
    # Get the base64-encoded text from the query parameters
    encoded_texts = request.args.get('texts')  # Note: 'texts' matches the frontend query parameter
    
    if not encoded_texts:
        return jsonify({"error": "Missing 'texts' query parameter"}), 400

    # Decode the base64-encoded text(s)
    try:
        # Decode and split the texts using the "||" delimiter
        decoded_texts = base64.b64decode(encoded_texts.encode('utf-8')).decode('utf-8')
        texts = decoded_texts.split('||')  # Handle double-pipe delimiter
    except Exception as e:
        return jsonify({"error": f"Failed to decode base64: {str(e)}"}), 400

    # Handle empty or invalid texts
    if not texts or all(text.strip() == "" for text in texts):
        return jsonify({"error": "No valid texts provided after decoding"}), 400

    try:
        # Transform the texts using the vectorizer (assumes vectorizer was trained)
        text_vect = vectorizer.transform(texts)

        # Get predictions and probabilities for each text
        predictions = model.predict(text_vect)
        probabilities = model.predict_proba(text_vect)

        # Create a response with text, label, and probability
        response = []
        for text, prediction, prob in zip(texts, predictions, probabilities):
            label = prediction
            probability = prob.max() * 100  # Get the highest probability and convert to percentage
            response.append({
                "text": text.strip(),  # Include the input text
                "label": label,       # The predicted label
                "probability": round(probability, 2)  # Round the probability to 2 decimal places
            })
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({"error": f"Failed to process input: {str(e)}"}), 500

@app.route('/infer_workflow', methods=['GET'])
def infer_workflow():
    base64_image_path = request.args.get('image_file_path')
    workflow_id = request.args.get('workflow_id')  # Get the workflow_id from the query parameters
    
    if not base64_image_path:
        return jsonify({"error": "Missing 'image_file_path' query parameter"}), 400
    
    if not workflow_id:
        return jsonify({"error": "Missing 'workflow_id' query parameter"}), 400
    
    try:
        decoded_path = base64.b64decode(base64_image_path).decode('utf-8')
    except Exception:
        return jsonify({"error": "Invalid base64 encoding for 'image_file_path'"}), 400
    
    image_path = os.path.join(decoded_path)    
    if not image_path:
        return jsonify({"error": "Image parameter is required"}), 400
    
    if not os.path.isfile(image_path):
        return jsonify({"error": "Image not found"}), 404

    with client.use_configuration(custom_configuration):
        try:
            predictions = client.run_workflow(
                workspace_name="flerovium",
                workflow_id=workflow_id,  # Use the provided workflow_id
                images={
                    "image": image_path
                }
            )
        except Exception as e:
            print(f"An error occurred: {e}")
            return jsonify({"error": "An error occurred during inference", "details": str(e)}), 500

    return jsonify(predictions)


@app.route('/infer_table', methods=['GET'])
def infer_table():
    base64_image_path = request.args.get('image_file_path')
    model_id = request.args.get('model_id') 
    
    if not base64_image_path:
        return jsonify({"error": "Missing 'image_file_path' query parameter"}), 400
    
    try:
        decoded_path = base64.b64decode(base64_image_path).decode('utf-8')
    except Exception:
        return jsonify({"error": "Invalid base64 encoding for 'image_file_path'"}), 400
    
    image_path = os.path.join(decoded_path)    
    if not image_path:
        return jsonify({"error": "Image parameter is required"}), 400
    
    if not os.path.isfile(image_path):
        return jsonify({"error": "Image not found"}), 404

    custom_configuration = InferenceConfiguration(confidence_threshold=0.9)
    with client.use_configuration(custom_configuration):
        try:
            predictions = client.infer(image_path,
                model_id=model_id
            )
        except Exception as e:
            print(f"An error occurred: {e}")
            return jsonify({"error": "An error occurred during inference", "details": str(e)}), 500

    return jsonify(predictions)

@app.route('/infer_tatr', methods=['GET'])
def infer_tatr():
    try:
        # Get the base64-encoded image from the request
        base64_image = request.args.get('image_file_path')
        if not base64_image:
            return jsonify({"error": "Missing 'image_file_path' parameter in the request."}), 400

        # Decode the base64 string and convert it to a PIL image
        image_path = base64.b64decode(base64_image).decode('utf-8')

        # Perform table detection and return the pandas DataFrame as JSON
        df = table_analyzer(image_path)  # Call the TableAnalyzer instance with the image
        df.to_json(orient="records")

        df.columns = df.iloc[0]  # First row becomes the column names
        df = df.drop(0).reset_index(drop=True)
        dataframe = df.to_json(orient="records")

        return jsonify({"success": True, "data": dataframe}), 200

    except Exception as e:
        # Handle any errors gracefully and return the stack trace
        traceback_str = traceback.format_exc()
        return jsonify({"success": False, "error": str(e), "trace": traceback_str}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)