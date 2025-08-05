#!/usr/bin/env python3
"""
Script to run the Transport Mode Detection ML service.
Handles model training and service startup.
"""

import sys
import os
import argparse
import subprocess
from pathlib import Path

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

from ml_service.transport_mode_detector import TransportModeDetector
from ml_service.gtfs_service import GTFSService


def setup_environment():
    """Set up the environment for the ML service."""
    print("Setting up ML service environment...")
    
    # Create necessary directories
    directories = [
        "models",
        "data",
        "logs"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"Created directory: {directory}")


def train_model(samples: int = 1000, force_retrain: bool = False):
    """Train the transport mode detection model."""
    print(f"Training transport mode detection model with {samples} samples...")
    
    detector = TransportModeDetector()
    
    # Check if model already exists
    if detector.load_model() and not force_retrain:
        print("Model already exists and is trained.")
        print("Use --force-retrain to retrain the model.")
        return True
    
    try:
        # Generate synthetic training data
        training_data = detector.generate_synthetic_data(samples)
        
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
        return True
        
    except Exception as e:
        print(f"Training failed: {e}")
        return False


def setup_gtfs_data():
    """Set up GTFS data (placeholder for now)."""
    print("Setting up GTFS data...")
    
    # Initialize GTFS service
    gtfs_service = GTFSService()
    
    print("GTFS service initialized.")
    print("Note: GTFS data download is disabled for demo purposes.")
    print("In production, you would download real GTFS feeds here.")
    
    return True


def run_service(host: str = "0.0.0.0", port: int = 8000):
    """Run the FastAPI service."""
    print(f"Starting Transport Mode Detection API on {host}:{port}...")
    
    try:
        # Import and run the FastAPI app
        from ml_service.api import app
        import uvicorn
        
        uvicorn.run(app, host=host, port=port, reload=True)
        
    except KeyboardInterrupt:
        print("\nService stopped by user.")
    except Exception as e:
        print(f"Error running service: {e}")


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Transport Mode Detection ML Service")
    parser.add_argument(
        "--setup", 
        action="store_true",
        help="Set up the environment (create directories, etc.)"
    )
    parser.add_argument(
        "--train", 
        action="store_true",
        help="Train the transport mode detection model"
    )
    parser.add_argument(
        "--samples", 
        type=int, 
        default=1000,
        help="Number of synthetic samples for training (default: 1000)"
    )
    parser.add_argument(
        "--force-retrain", 
        action="store_true",
        help="Force retraining even if model exists"
    )
    parser.add_argument(
        "--gtfs", 
        action="store_true",
        help="Set up GTFS data"
    )
    parser.add_argument(
        "--run", 
        action="store_true",
        help="Run the FastAPI service"
    )
    parser.add_argument(
        "--host", 
        type=str, 
        default="0.0.0.0",
        help="Host to bind the service to (default: 0.0.0.0)"
    )
    parser.add_argument(
        "--port", 
        type=int, 
        default=8000,
        help="Port to bind the service to (default: 8000)"
    )
    parser.add_argument(
        "--all", 
        action="store_true",
        help="Run all setup steps (setup, train, gtfs, run)"
    )
    
    args = parser.parse_args()
    
    if args.all:
        # Run all steps
        print("=== Running all setup steps ===")
        
        # Setup environment
        setup_environment()
        
        # Train model
        if not train_model(args.samples, args.force_retrain):
            print("Model training failed. Exiting.")
            return
        
        # Setup GTFS
        setup_gtfs_data()
        
        # Run service
        run_service(args.host, args.port)
        
    else:
        # Run individual steps
        if args.setup:
            setup_environment()
        
        if args.train:
            if not train_model(args.samples, args.force_retrain):
                print("Model training failed.")
                return
        
        if args.gtfs:
            setup_gtfs_data()
        
        if args.run:
            run_service(args.host, args.port)
        
        if not any([args.setup, args.train, args.gtfs, args.run]):
            # Default: show help
            parser.print_help()


if __name__ == "__main__":
    main() 