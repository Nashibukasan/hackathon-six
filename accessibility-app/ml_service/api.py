"""
FastAPI service for transport mode detection.
Provides REST API endpoints for training and prediction.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uvicorn
import json
import os
from datetime import datetime

from .transport_mode_detector import TransportModeDetector
from .feature_extraction import SensorData

# Initialize FastAPI app
app = FastAPI(
    title="Transport Mode Detection API",
    description="AI-powered transport mode detection using sensor data",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the detector
detector = TransportModeDetector()

# Pydantic models for API requests/responses
class SensorDataPoint(BaseModel):
    timestamp: float
    acceleration_x: float
    acceleration_y: float
    acceleration_z: float
    gyroscope_x: Optional[float] = None
    gyroscope_y: Optional[float] = None
    gyroscope_z: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    accuracy: Optional[float] = None

class TrainingSample(BaseModel):
    sensor_data: List[SensorDataPoint]
    transport_mode: str = Field(..., description="Transport mode label")

class PredictionRequest(BaseModel):
    sensor_data: List[SensorDataPoint]

class PredictionResponse(BaseModel):
    window_index: int
    transport_mode: str
    confidence: float
    probabilities: Dict[str, float]

class TrainingRequest(BaseModel):
    training_data: List[TrainingSample]
    generate_synthetic: bool = False
    num_synthetic_samples: int = 1000

class TrainingResponse(BaseModel):
    success: bool
    message: str
    metrics: Optional[Dict[str, float]] = None

class ModelInfoResponse(BaseModel):
    is_trained: bool
    model_path: str
    feature_count: Optional[int] = None
    transport_modes: List[str]
    last_trained: Optional[str] = None

class FeatureImportanceResponse(BaseModel):
    feature_importance: Dict[str, float]

@app.on_event("startup")
async def startup_event():
    """Initialize the model on startup."""
    print("Starting Transport Mode Detection API...")
    
    # Try to load existing model
    if detector.load_model():
        print("Loaded existing trained model")
    else:
        print("No existing model found. Train a model using /train endpoint")

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Transport Mode Detection API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health", response_model=Dict[str, str])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "model_loaded": detector.is_trained
    }

@app.get("/model/info", response_model=ModelInfoResponse)
async def get_model_info():
    """Get information about the current model."""
    return ModelInfoResponse(
        is_trained=detector.is_trained,
        model_path=detector.model_path,
        feature_count=len(detector.feature_names) if detector.feature_names else None,
        transport_modes=detector.TRANSPORT_MODES,
        last_trained=detector.model_path if os.path.exists(detector.model_path) else None
    )

@app.get("/model/features/importance", response_model=FeatureImportanceResponse)
async def get_feature_importance():
    """Get feature importance scores."""
    if not detector.is_trained:
        raise HTTPException(status_code=400, detail="Model not trained")
    
    importance = detector.get_feature_importance()
    return FeatureImportanceResponse(feature_importance=importance)

@app.post("/predict", response_model=List[PredictionResponse])
async def predict_transport_mode(request: PredictionRequest):
    """
    Predict transport mode for sensor data.
    
    Args:
        request: Sensor data points
        
    Returns:
        List of predictions with confidence scores
    """
    if not detector.is_trained:
        raise HTTPException(status_code=400, detail="Model not trained. Please train the model first.")
    
    try:
        # Convert to SensorData objects
        sensor_data = [
            SensorData(
                timestamp=point.timestamp,
                acceleration_x=point.acceleration_x,
                acceleration_y=point.acceleration_y,
                acceleration_z=point.acceleration_z,
                gyroscope_x=point.gyroscope_x,
                gyroscope_y=point.gyroscope_y,
                gyroscope_z=point.gyroscope_z,
                latitude=point.latitude,
                longitude=point.longitude,
                speed=point.speed,
                heading=point.heading,
                accuracy=point.accuracy
            )
            for point in request.sensor_data
        ]
        
        # Make predictions
        predictions = detector.predict(sensor_data)
        
        return predictions
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/predict/single", response_model=PredictionResponse)
async def predict_single_window(request: PredictionRequest):
    """
    Predict transport mode for a single window of sensor data.
    
    Args:
        request: Sensor data points (should be window_size length)
        
    Returns:
        Single prediction with confidence score
    """
    if not detector.is_trained:
        raise HTTPException(status_code=400, detail="Model not trained. Please train the model first.")
    
    try:
        # Convert to SensorData objects
        sensor_data = [
            SensorData(
                timestamp=point.timestamp,
                acceleration_x=point.acceleration_x,
                acceleration_y=point.acceleration_y,
                acceleration_z=point.acceleration_z,
                gyroscope_x=point.gyroscope_x,
                gyroscope_y=point.gyroscope_y,
                gyroscope_z=point.gyroscope_z,
                latitude=point.latitude,
                longitude=point.longitude,
                speed=point.speed,
                heading=point.heading,
                accuracy=point.accuracy
            )
            for point in request.sensor_data
        ]
        
        # Make prediction
        prediction = detector.predict_single_window(sensor_data)
        
        if prediction is None:
            raise HTTPException(status_code=400, detail="Insufficient data for prediction")
        
        return prediction
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/train", response_model=TrainingResponse)
async def train_model(request: TrainingRequest, background_tasks: BackgroundTasks):
    """
    Train the transport mode detection model.
    
    Args:
        request: Training data and options
        background_tasks: Background task manager
        
    Returns:
        Training status and metrics
    """
    try:
        training_data = []
        
        # Add provided training data
        for sample in request.training_data:
            training_data.append({
                'sensor_data': [point.dict() for point in sample.sensor_data],
                'transport_mode': sample.transport_mode
            })
        
        # Generate synthetic data if requested
        if request.generate_synthetic:
            synthetic_data = detector.generate_synthetic_data(request.num_synthetic_samples)
            training_data.extend(synthetic_data)
        
        if not training_data:
            raise HTTPException(status_code=400, detail="No training data provided")
        
        # Train model
        metrics = detector.train(training_data)
        
        return TrainingResponse(
            success=True,
            message=f"Model trained successfully with {len(training_data)} samples",
            metrics=metrics
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.post("/train/synthetic", response_model=TrainingResponse)
async def train_with_synthetic_data(num_samples: int = 1000):
    """
    Train the model using only synthetic data.
    
    Args:
        num_samples: Number of synthetic samples to generate
        
    Returns:
        Training status and metrics
    """
    try:
        # Generate synthetic training data
        training_data = detector.generate_synthetic_data(num_samples)
        
        # Train model
        metrics = detector.train(training_data)
        
        return TrainingResponse(
            success=True,
            message=f"Model trained successfully with {len(training_data)} synthetic samples",
            metrics=metrics
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.get("/transport-modes", response_model=List[str])
async def get_transport_modes():
    """Get list of supported transport modes."""
    return detector.TRANSPORT_MODES

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 