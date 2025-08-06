"""
Transport Mode Detection using machine learning.
Implements a Random Forest classifier for detecting transport modes from sensor data.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional, Any
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
import json
import os
from datetime import datetime

from .feature_extraction import FeatureExtractor, SensorData


class TransportModeDetector:
    """Transport mode detection using machine learning."""
    
    # Transport modes we can detect
    TRANSPORT_MODES = [
        'walking',
        'cycling', 
        'bus',
        'train',
        'tram',
        'car',
        'stationary'
    ]
    
    def __init__(self, model_path: str = "models/transport_mode_model.pkl"):
        """
        Initialize the transport mode detector.
        
        Args:
            model_path: Path to save/load the trained model
        """
        self.model_path = model_path
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.feature_extractor = FeatureExtractor()
        self.feature_names = None
        self.is_trained = False
        
        # Create models directory if it doesn't exist
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    def train(self, training_data: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Train the transport mode detection model.
        
        Args:
            training_data: List of training samples with 'sensor_data' and 'transport_mode' keys
            
        Returns:
            Dictionary with training metrics
        """
        print("Starting model training...")
        
        # Extract features and labels
        features_list = []
        labels = []
        
        for sample in training_data:
            sensor_data = [SensorData(**point) for point in sample['sensor_data']]
            transport_mode = sample['transport_mode']
            
            # Extract features
            window_features = self.feature_extractor.extract_features(sensor_data)
            
            for features in window_features:
                features_list.append(features)
                labels.append(transport_mode)
        
        if not features_list:
            raise ValueError("No valid features extracted from training data")
        
        # Convert to DataFrame
        X = pd.DataFrame(features_list)
        y = np.array(labels)
        
        # Handle NaN values in features
        X = X.fillna(0.0)
        
        # Store feature names
        self.feature_names = X.columns.tolist()
        
        # Encode labels
        y_encoded = self.label_encoder.fit_transform(y)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        
        print(f"Training with {len(X_train_scaled)} samples, {len(self.feature_names)} features")
        print(f"Feature names: {self.feature_names[:5]}...")  # Show first 5 features
        
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Cross-validation
        cv_scores = cross_val_score(
            self.model, X_train_scaled, y_train, cv=5, scoring='accuracy'
        )
        
        # Generate detailed metrics
        metrics = {
            'accuracy': accuracy,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std(),
            'feature_importance': dict(zip(self.feature_names, self.model.feature_importances_))
        }
        
        # Set trained flag before saving
        self.is_trained = True
        
        # Save model
        self.save_model()
        
        print(f"Model training completed. Accuracy: {accuracy:.3f}")
        print(f"Cross-validation score: {cv_scores.mean():.3f} (+/- {cv_scores.std() * 2:.3f})")
        
        return metrics
    
    def predict(self, sensor_data: List[SensorData]) -> List[Dict[str, Any]]:
        """
        Predict transport mode for sensor data.
        
        Args:
            sensor_data: List of sensor data points
            
        Returns:
            List of predictions with mode and confidence
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        # Extract features
        features_list = self.feature_extractor.extract_features(sensor_data)
        
        if not features_list:
            return []
        
        # Convert to DataFrame
        X = pd.DataFrame(features_list)
        
        # Ensure all expected features are present
        for feature in self.feature_names:
            if feature not in X.columns:
                X[feature] = 0.0
        
        # Reorder columns to match training data
        X = X[self.feature_names]
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Make predictions
        predictions = self.model.predict(X_scaled)
        probabilities = self.model.predict_proba(X_scaled)
        
        # Convert back to original labels
        predicted_modes = self.label_encoder.inverse_transform(predictions)
        
        # Create results
        results = []
        for i, (mode, prob) in enumerate(zip(predicted_modes, probabilities)):
            confidence = float(np.max(prob))
            results.append({
                'window_index': i,
                'transport_mode': mode,
                'confidence': confidence,
                'probabilities': dict(zip(self.label_encoder.classes_, prob.tolist()))
            })
        
        return results
    
    def predict_single_window(self, sensor_data: List[SensorData]) -> Dict[str, Any]:
        """
        Predict transport mode for a single window of sensor data.
        
        Args:
            sensor_data: List of sensor data points (should be window_size length)
            
        Returns:
            Prediction with mode and confidence
        """
        predictions = self.predict(sensor_data)
        return predictions[0] if predictions else None
    
    def save_model(self):
        """Save the trained model and preprocessing objects."""
        if not self.is_trained:
            raise ValueError("No trained model to save")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'label_encoder': self.label_encoder,
            'feature_names': self.feature_names,
            'feature_extractor_config': {
                'window_size': self.feature_extractor.window_size,
                'overlap': self.feature_extractor.overlap
            },
            'trained_at': datetime.now().isoformat()
        }
        
        joblib.dump(model_data, self.model_path)
        print(f"Model saved to {self.model_path}")
    
    def load_model(self) -> bool:
        """
        Load a trained model from disk.
        
        Returns:
            True if model loaded successfully, False otherwise
        """
        if not os.path.exists(self.model_path):
            print(f"No model found at {self.model_path}")
            return False
        
        try:
            model_data = joblib.load(self.model_path)
            
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.label_encoder = model_data['label_encoder']
            self.feature_names = model_data['feature_names']
            
            # Recreate feature extractor with saved config
            config = model_data['feature_extractor_config']
            self.feature_extractor = FeatureExtractor(
                window_size=config['window_size'],
                overlap=config['overlap']
            )
            
            self.is_trained = True
            print(f"Model loaded from {self.model_path}")
            return True
            
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance scores."""
        if not self.is_trained:
            return {}
        
        return dict(zip(self.feature_names, self.model.feature_importances_))
    
    def generate_synthetic_data(self, num_samples: int = 1000) -> List[Dict[str, Any]]:
        """
        Generate synthetic training data for demonstration purposes.
        
        Args:
            num_samples: Number of samples to generate
            
        Returns:
            List of synthetic training samples
        """
        print(f"Generating {num_samples} synthetic training samples...")
        
        synthetic_data = []
        samples_per_mode = num_samples // len(self.TRANSPORT_MODES)
        
        for mode in self.TRANSPORT_MODES:
            for _ in range(samples_per_mode):
                # Generate sensor data based on transport mode characteristics
                sensor_data = self._generate_synthetic_sensor_data(mode)
                
                synthetic_data.append({
                    'sensor_data': sensor_data,
                    'transport_mode': mode
                })
        
        return synthetic_data
    
    def _generate_synthetic_sensor_data(self, transport_mode: str) -> List[Dict[str, Any]]:
        """Generate synthetic sensor data for a specific transport mode."""
        window_size = self.feature_extractor.window_size
        sensor_data = []
        
        # Base parameters for each transport mode
        mode_params = {
            'walking': {
                'accel_std': 0.5,
                'speed_mean': 1.4,
                'speed_std': 0.3,
                'vibration_freq': 2.0
            },
            'cycling': {
                'accel_std': 0.8,
                'speed_mean': 5.0,
                'speed_std': 1.0,
                'vibration_freq': 1.5
            },
            'bus': {
                'accel_std': 1.2,
                'speed_mean': 12.0,
                'speed_std': 3.0,
                'vibration_freq': 0.8
            },
            'train': {
                'accel_std': 0.6,
                'speed_mean': 25.0,
                'speed_std': 5.0,
                'vibration_freq': 0.5
            },
            'tram': {
                'accel_std': 0.7,
                'speed_mean': 15.0,
                'speed_std': 4.0,
                'vibration_freq': 0.6
            },
            'car': {
                'accel_std': 1.0,
                'speed_mean': 20.0,
                'speed_std': 8.0,
                'vibration_freq': 0.3
            },
            'stationary': {
                'accel_std': 0.1,
                'speed_mean': 0.0,
                'speed_std': 0.1,
                'vibration_freq': 0.0
            }
        }
        
        params = mode_params.get(transport_mode, mode_params['walking'])
        
        for i in range(window_size):
            timestamp = datetime.now().timestamp() + i * 0.1
            
            # Generate accelerometer data with mode-specific characteristics
            base_accel = 9.81  # Gravity
            vibration = params['vibration_freq'] * np.sin(2 * np.pi * i * 0.1)
            
            acceleration_x = np.random.normal(0, params['accel_std']) + vibration
            acceleration_y = np.random.normal(0, params['accel_std']) + vibration
            acceleration_z = base_accel + np.random.normal(0, params['accel_std'])
            
            # Generate gyroscope data
            gyroscope_x = np.random.normal(0, 0.1)
            gyroscope_y = np.random.normal(0, 0.1)
            gyroscope_z = np.random.normal(0, 0.1)
            
            # Generate GPS data
            speed = np.random.normal(params['speed_mean'], params['speed_std'])
            speed = max(0, speed)  # Speed cannot be negative
            
            # Simulate movement for non-stationary modes
            if transport_mode != 'stationary':
                latitude = -37.8136 + i * 0.0001  # Melbourne coordinates
                longitude = 144.9631 + i * 0.0001
                heading = np.random.uniform(0, 360)
            else:
                latitude = -37.8136
                longitude = 144.9631
                heading = 0
            
            sensor_data.append({
                'timestamp': timestamp,
                'acceleration_x': float(acceleration_x),
                'acceleration_y': float(acceleration_y),
                'acceleration_z': float(acceleration_z),
                'gyroscope_x': float(gyroscope_x),
                'gyroscope_y': float(gyroscope_y),
                'gyroscope_z': float(gyroscope_z),
                'latitude': float(latitude),
                'longitude': float(longitude),
                'speed': float(speed),
                'heading': float(heading),
                'accuracy': 5.0
            })
        
        return sensor_data 