"""
Hybrid Inference Engine for transport mode detection.
Combines sensor-based TMD with GTFS vehicle position data for improved accuracy.
"""

import numpy as np
import math
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
import logging

from .transport_mode_detector import TransportModeDetector
from .gtfs_service import GTFSService
from .feature_extraction import SensorData

logger = logging.getLogger(__name__)


class HybridInferenceEngine:
    """
    Hybrid inference engine that combines sensor-based TMD with GTFS data.
    
    This engine improves transport mode detection accuracy by:
    1. Using sensor data for initial mode prediction
    2. Cross-referencing with GTFS vehicle positions
    3. Resolving ambiguities using spatial and temporal matching
    4. Providing confidence scores based on multiple data sources
    """
    
    def __init__(self, 
                 tmd_model_path: str = "models/transport_mode_model.pkl",
                 gtfs_db_path: str = "data/gtfs.db"):
        """
        Initialize the hybrid inference engine.
        
        Args:
            tmd_model_path: Path to the trained TMD model
            gtfs_db_path: Path to the GTFS database
        """
        self.tmd_detector = TransportModeDetector(tmd_model_path)
        self.gtfs_service = GTFSService(gtfs_db_path)
        
        # Load the TMD model
        if not self.tmd_detector.load_model():
            logger.warning("TMD model not loaded. Hybrid inference will use GTFS data only.")
        
        # Configuration parameters
        self.vehicle_search_radius = 100  # meters
        self.time_window_minutes = 5
        self.spatial_threshold = 50  # meters
        self.temporal_threshold = 300  # seconds
        self.confidence_boost = 0.2  # Confidence boost for GTFS matches
        
        # Mode-specific parameters
        self.mode_characteristics = {
            'bus': {
                'min_speed': 5.0,
                'max_speed': 60.0,
                'typical_speed': 25.0,
                'acceleration_pattern': 'moderate',
                'stops_frequent': True
            },
            'train': {
                'min_speed': 10.0,
                'max_speed': 100.0,
                'typical_speed': 50.0,
                'acceleration_pattern': 'smooth',
                'stops_frequent': False
            },
            'tram': {
                'min_speed': 5.0,
                'max_speed': 40.0,
                'typical_speed': 20.0,
                'acceleration_pattern': 'moderate',
                'stops_frequent': True
            },
            'car': {
                'min_speed': 5.0,
                'max_speed': 80.0,
                'typical_speed': 30.0,
                'acceleration_pattern': 'variable',
                'stops_frequent': False
            },
            'cycling': {
                'min_speed': 2.0,
                'max_speed': 25.0,
                'typical_speed': 15.0,
                'acceleration_pattern': 'variable',
                'stops_frequent': False
            },
            'walking': {
                'min_speed': 0.5,
                'max_speed': 5.0,
                'typical_speed': 1.4,
                'acceleration_pattern': 'irregular',
                'stops_frequent': True
            }
        }
    
    def infer_transport_mode(self, sensor_data: List[SensorData]) -> List[Dict[str, Any]]:
        """
        Perform hybrid inference to determine transport mode.
        
        Args:
            sensor_data: List of sensor data points
            
        Returns:
            List of inference results with mode, confidence, and supporting evidence
        """
        if not sensor_data:
            return []
        
        results = []
        
        # Get sensor-based predictions
        sensor_predictions = self._get_sensor_predictions(sensor_data)
        
        # Get GTFS vehicle data for relevant time periods
        gtfs_data = self._get_gtfs_data(sensor_data)
        
        # Perform hybrid inference for each window
        for i, sensor_pred in enumerate(sensor_predictions):
            hybrid_result = self._hybrid_inference_single_window(
                sensor_pred, gtfs_data, sensor_data, i
            )
            results.append(hybrid_result)
        
        return results
    
    def _get_sensor_predictions(self, sensor_data: List[SensorData]) -> List[Dict[str, Any]]:
        """Get sensor-based transport mode predictions."""
        if not self.tmd_detector.is_trained:
            # Fallback to basic heuristics if model not trained
            return self._basic_sensor_heuristics(sensor_data)
        
        try:
            return self.tmd_detector.predict(sensor_data)
        except Exception as e:
            logger.error(f"Error getting sensor predictions: {e}")
            return self._basic_sensor_heuristics(sensor_data)
    
    def _basic_sensor_heuristics(self, sensor_data: List[SensorData]) -> List[Dict[str, Any]]:
        """Basic heuristics for transport mode detection when ML model is not available."""
        if len(sensor_data) < 10:
            return []
        
        # Calculate average speed
        speeds = [s.speed or 0 for s in sensor_data if s.speed is not None]
        avg_speed = np.mean(speeds) if speeds else 0
        
        # Calculate acceleration variance
        accel_magnitudes = []
        for s in sensor_data:
            mag = math.sqrt(s.acceleration_x**2 + s.acceleration_y**2 + s.acceleration_z**2)
            accel_magnitudes.append(mag)
        
        accel_variance = np.var(accel_magnitudes) if accel_magnitudes else 0
        
        # Simple rule-based classification
        if avg_speed < 2:
            mode = 'walking'
            confidence = 0.7
        elif avg_speed < 8:
            mode = 'cycling'
            confidence = 0.6
        elif avg_speed < 15:
            mode = 'tram'
            confidence = 0.5
        elif avg_speed < 30:
            mode = 'bus'
            confidence = 0.5
        else:
            mode = 'train'
            confidence = 0.6
        
        return [{
            'window_index': 0,
            'transport_mode': mode,
            'confidence': confidence,
            'probabilities': {mode: confidence}
        }]
    
    def _get_gtfs_data(self, sensor_data: List[SensorData]) -> List[Dict[str, Any]]:
        """Get relevant GTFS vehicle data for the sensor data time period."""
        gtfs_data = []
        
        # Get GPS coordinates from sensor data
        gps_points = [(s.latitude, s.longitude) for s in sensor_data 
                     if s.latitude is not None and s.longitude is not None]
        
        if not gps_points:
            return gtfs_data
        
        # Calculate bounding box
        lats = [p[0] for p in gps_points]
        lons = [p[1] for p in gps_points]
        
        center_lat = np.mean(lats)
        center_lon = np.mean(lons)
        
        # Get nearby vehicles
        try:
            vehicles = self.gtfs_service.get_nearby_vehicles(
                center_lat, center_lon,
                radius_meters=self.vehicle_search_radius,
                time_window_minutes=self.time_window_minutes
            )
            gtfs_data.extend(vehicles)
        except Exception as e:
            logger.error(f"Error getting GTFS data: {e}")
        
        return gtfs_data
    
    def _hybrid_inference_single_window(self, 
                                      sensor_pred: Dict[str, Any],
                                      gtfs_data: List[Dict[str, Any]],
                                      sensor_data: List[SensorData],
                                      window_index: int) -> Dict[str, Any]:
        """
        Perform hybrid inference for a single window.
        
        Args:
            sensor_pred: Sensor-based prediction
            gtfs_data: GTFS vehicle data
            sensor_data: Original sensor data
            window_index: Window index
            
        Returns:
            Hybrid inference result
        """
        # Start with sensor prediction
        result = {
            'window_index': window_index,
            'transport_mode': sensor_pred['transport_mode'],
            'confidence': sensor_pred['confidence'],
            'probabilities': sensor_pred['probabilities'],
            'evidence': {
                'sensor_based': True,
                'gtfs_matched': False,
                'gtfs_vehicles': [],
                'spatial_matches': [],
                'temporal_matches': []
            }
        }
        
        # Try to match with GTFS data
        if gtfs_data and sensor_pred['transport_mode'] in ['bus', 'train', 'tram']:
            gtfs_matches = self._find_gtfs_matches(
                sensor_data, gtfs_data, sensor_pred['transport_mode']
            )
            
            if gtfs_matches:
                result['evidence']['gtfs_matched'] = True
                result['evidence']['gtfs_vehicles'] = gtfs_matches
                
                # Boost confidence for GTFS matches
                result['confidence'] = min(1.0, result['confidence'] + self.confidence_boost)
                
                # Update mode if GTFS provides stronger evidence
                gtfs_mode = self._infer_mode_from_gtfs(gtfs_matches)
                if gtfs_mode and gtfs_mode != sensor_pred['transport_mode']:
                    # Only update if GTFS confidence is high
                    gtfs_confidence = self._calculate_gtfs_confidence(gtfs_matches)
                    if gtfs_confidence > result['confidence']:
                        result['transport_mode'] = gtfs_mode
                        result['confidence'] = gtfs_confidence
        
        # Apply mode-specific validation
        result = self._validate_mode_characteristics(result, sensor_data)
        
        return result
    
    def _find_gtfs_matches(self, 
                          sensor_data: List[SensorData],
                          gtfs_data: List[Dict[str, Any]],
                          predicted_mode: str) -> List[Dict[str, Any]]:
        """
        Find GTFS vehicles that match the sensor data.
        
        Args:
            sensor_data: Sensor data points
            gtfs_data: GTFS vehicle data
            predicted_mode: Predicted transport mode
            
        Returns:
            List of matching GTFS vehicles
        """
        matches = []
        
        # Get GPS coordinates from sensor data
        gps_points = [(s.latitude, s.longitude, s.timestamp) for s in sensor_data 
                     if s.latitude is not None and s.longitude is not None]
        
        if not gps_points:
            return matches
        
        for vehicle in gtfs_data:
            vehicle_lat = vehicle['latitude']
            vehicle_lon = vehicle['longitude']
            vehicle_timestamp = vehicle['timestamp']
            
            # Check spatial proximity
            spatial_matches = []
            for lat, lon, timestamp in gps_points:
                distance = self._calculate_distance(lat, lon, vehicle_lat, vehicle_lon)
                time_diff = abs(timestamp - vehicle_timestamp)
                
                if (distance <= self.spatial_threshold and 
                    time_diff <= self.temporal_threshold):
                    spatial_matches.append({
                        'distance': distance,
                        'time_diff': time_diff,
                        'sensor_point': (lat, lon, timestamp)
                    })
            
            if spatial_matches:
                # Calculate overall match score
                match_score = self._calculate_match_score(spatial_matches, vehicle)
                vehicle['match_score'] = match_score
                vehicle['spatial_matches'] = spatial_matches
                matches.append(vehicle)
        
        # Sort by match score
        matches.sort(key=lambda x: x['match_score'], reverse=True)
        
        return matches
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate haversine distance between two points."""
        R = 6371000  # Earth's radius in meters
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_lat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    def _calculate_match_score(self, spatial_matches: List[Dict], vehicle: Dict) -> float:
        """Calculate overall match score for a GTFS vehicle."""
        if not spatial_matches:
            return 0.0
        
        # Average distance score (closer is better)
        avg_distance = np.mean([m['distance'] for m in spatial_matches])
        distance_score = max(0, 1 - (avg_distance / self.spatial_threshold))
        
        # Temporal consistency score
        time_diffs = [m['time_diff'] for m in spatial_matches]
        temporal_score = max(0, 1 - (np.mean(time_diffs) / self.temporal_threshold))
        
        # Route type consistency (if available)
        route_type_score = 1.0
        if 'route_type' in vehicle:
            route_type = vehicle['route_type']
            # Map GTFS route types to our modes
            route_type_mapping = {
                0: 'tram',
                1: 'train',
                3: 'bus'
            }
            if route_type in route_type_mapping:
                route_type_score = 1.0
            else:
                route_type_score = 0.5
        
        # Weighted combination
        match_score = (0.4 * distance_score + 
                      0.4 * temporal_score + 
                      0.2 * route_type_score)
        
        return match_score
    
    def _infer_mode_from_gtfs(self, gtfs_matches: List[Dict[str, Any]]) -> Optional[str]:
        """Infer transport mode from GTFS vehicle data."""
        if not gtfs_matches:
            return None
        
        # Count route types
        route_types = {}
        for vehicle in gtfs_matches:
            route_type = vehicle.get('route_type')
            if route_type is not None:
                route_types[route_type] = route_types.get(route_type, 0) + 1
        
        if not route_types:
            return None
        
        # Map most common route type to mode
        most_common_type = max(route_types.items(), key=lambda x: x[1])[0]
        
        route_type_mapping = {
            0: 'tram',
            1: 'train',
            3: 'bus'
        }
        
        return route_type_mapping.get(most_common_type)
    
    def _calculate_gtfs_confidence(self, gtfs_matches: List[Dict[str, Any]]) -> float:
        """Calculate confidence score based on GTFS matches."""
        if not gtfs_matches:
            return 0.0
        
        # Average match score
        avg_match_score = np.mean([v['match_score'] for v in gtfs_matches])
        
        # Number of matches (more matches = higher confidence)
        num_matches = len(gtfs_matches)
        match_count_score = min(1.0, num_matches / 3.0)
        
        # Combined confidence
        confidence = 0.7 * avg_match_score + 0.3 * match_count_score
        
        return confidence
    
    def _validate_mode_characteristics(self, 
                                     result: Dict[str, Any], 
                                     sensor_data: List[SensorData]) -> Dict[str, Any]:
        """
        Validate the inferred mode against known characteristics.
        
        Args:
            result: Inference result
            sensor_data: Sensor data
            
        Returns:
            Updated result with validation
        """
        mode = result['transport_mode']
        
        if mode not in self.mode_characteristics:
            return result
        
        characteristics = self.mode_characteristics[mode]
        
        # Validate speed characteristics
        speeds = [s.speed or 0 for s in sensor_data if s.speed is not None]
        if speeds:
            avg_speed = np.mean(speeds)
            min_speed = characteristics['min_speed']
            max_speed = characteristics['max_speed']
            
            if avg_speed < min_speed or avg_speed > max_speed:
                # Reduce confidence for speed mismatch
                result['confidence'] *= 0.8
                result['evidence']['speed_mismatch'] = True
        
        # Validate acceleration patterns
        accel_magnitudes = []
        for s in sensor_data:
            mag = math.sqrt(s.acceleration_x**2 + s.acceleration_y**2 + s.acceleration_z**2)
            accel_magnitudes.append(mag)
        
        if accel_magnitudes:
            accel_variance = np.var(accel_magnitudes)
            
            # Check if acceleration pattern matches expected characteristics
            if characteristics['acceleration_pattern'] == 'smooth' and accel_variance > 2.0:
                result['confidence'] *= 0.9
            elif characteristics['acceleration_pattern'] == 'irregular' and accel_variance < 0.5:
                result['confidence'] *= 0.9
        
        return result
    
    def get_inference_summary(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate a summary of inference results.
        
        Args:
            results: List of inference results
            
        Returns:
            Summary statistics
        """
        if not results:
            return {}
        
        # Mode distribution
        mode_counts = {}
        total_confidence = 0
        
        for result in results:
            mode = result['transport_mode']
            confidence = result['confidence']
            
            mode_counts[mode] = mode_counts.get(mode, 0) + 1
            total_confidence += confidence
        
        # Calculate average confidence
        avg_confidence = total_confidence / len(results)
        
        # Most common mode
        most_common_mode = max(mode_counts.items(), key=lambda x: x[1])[0]
        
        # GTFS match statistics
        gtfs_matches = sum(1 for r in results if r['evidence']['gtfs_matched'])
        gtfs_match_rate = gtfs_matches / len(results)
        
        return {
            'total_windows': len(results),
            'mode_distribution': mode_counts,
            'most_common_mode': most_common_mode,
            'average_confidence': avg_confidence,
            'gtfs_match_rate': gtfs_match_rate,
            'gtfs_matches': gtfs_matches
        } 