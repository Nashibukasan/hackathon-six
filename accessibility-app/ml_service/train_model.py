#!/usr/bin/env python3
"""
Training script for transport mode detection model.
Initializes the model with synthetic data for demonstration.
"""

import sys
import os
import argparse
from pathlib import Path

# Add the parent directory to the path so we can import our modules
sys.path.append(str(Path(__file__).parent.parent))

from ml_service.transport_mode_detector import TransportModeDetector


def main():
    """Main training function."""
    parser = argparse.ArgumentParser(description="Train transport mode detection model")
    parser.add_argument(
        "--samples", 
        type=int, 
        default=1000, 
        help="Number of synthetic samples to generate (default: 1000)"
    )
    parser.add_argument(
        "--model-path", 
        type=str, 
        default="models/transport_mode_model.pkl",
        help="Path to save the trained model"
    )
    parser.add_argument(
        "--force-retrain", 
        action="store_true",
        help="Force retraining even if model exists"
    )
    
    args = parser.parse_args()
    
    print("=== Transport Mode Detection Model Training ===")
    print(f"Generating {args.samples} synthetic training samples...")
    
    # Initialize detector
    detector = TransportModeDetector(model_path=args.model_path)
    
    # Check if model already exists
    if detector.load_model() and not args.force_retrain:
        print("Model already exists and is trained.")
        print("Use --force-retrain to retrain the model.")
        return
    
    try:
        # Generate synthetic training data
        training_data = detector.generate_synthetic_data(args.samples)
        
        print(f"Generated {len(training_data)} training samples")
        print("Training transport mode detection model...")
        
        # Train the model
        metrics = detector.train(training_data)
        
        print("\n=== Training Results ===")
        print(f"Accuracy: {metrics['accuracy']:.3f}")
        print(f"Cross-validation score: {metrics['cv_mean']:.3f} (+/- {metrics['cv_std'] * 2:.3f})")
        print(f"Model saved to: {detector.model_path}")
        
        # Show top features
        print("\n=== Top 10 Most Important Features ===")
        feature_importance = metrics['feature_importance']
        sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
        
        for i, (feature, importance) in enumerate(sorted_features[:10]):
            print(f"{i+1:2d}. {feature}: {importance:.4f}")
        
        print("\nTraining completed successfully!")
        
    except Exception as e:
        print(f"Training failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main() 