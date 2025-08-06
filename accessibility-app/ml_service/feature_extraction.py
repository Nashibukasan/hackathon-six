"""
Feature extraction for transport mode detection.
Extracts features from accelerometer and GPS data for ML classification.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from scipy import stats
from scipy.signal import butter, filtfilt
import math


@dataclass
class SensorData:
    """Container for sensor data points."""
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


class FeatureExtractor:
    """Extracts features from sensor data for transport mode detection."""
    
    def __init__(self, window_size: int = 50, overlap: float = 0.5):
        """
        Initialize feature extractor.
        
        Args:
            window_size: Number of samples per window
            overlap: Overlap ratio between windows (0-1)
        """
        self.window_size = window_size
        self.overlap = overlap
        self.step_size = int(window_size * (1 - overlap))
    
    def extract_features(self, sensor_data: List[SensorData]) -> List[Dict[str, float]]:
        """
        Extract features from sensor data using sliding windows.
        
        Args:
            sensor_data: List of sensor data points
            
        Returns:
            List of feature dictionaries for each window
        """
        if len(sensor_data) < self.window_size:
            return []
        
        features = []
        
        for i in range(0, len(sensor_data) - self.window_size + 1, self.step_size):
            window = sensor_data[i:i + self.window_size]
            window_features = self._extract_window_features(window)
            features.append(window_features)
        
        return features
    
    def _extract_window_features(self, window: List[SensorData]) -> Dict[str, float]:
        """Extract features from a single window of sensor data."""
        features = {}
        
        # Extract accelerometer features
        accel_features = self._extract_accelerometer_features(window)
        features.update(accel_features)
        
        # Extract gyroscope features if available
        if any(w.gyroscope_x is not None for w in window):
            gyro_features = self._extract_gyroscope_features(window)
            features.update(gyro_features)
        
        # Extract GPS features if available
        if any(w.latitude is not None for w in window):
            gps_features = self._extract_gps_features(window)
            features.update(gps_features)
        
        return features
    
    def _extract_accelerometer_features(self, window: List[SensorData]) -> Dict[str, float]:
        """Extract features from accelerometer data."""
        accel_x = [w.acceleration_x for w in window]
        accel_y = [w.acceleration_y for w in window]
        accel_z = [w.acceleration_z for w in window]
        
        # Calculate magnitude
        accel_magnitude = [math.sqrt(x**2 + y**2 + z**2) for x, y, z in zip(accel_x, accel_y, accel_z)]
        
        features = {}
        
        # Statistical features
        features.update(self._statistical_features(accel_x, "accel_x"))
        features.update(self._statistical_features(accel_y, "accel_y"))
        features.update(self._statistical_features(accel_z, "accel_z"))
        features.update(self._statistical_features(accel_magnitude, "accel_magnitude"))
        
        # Frequency domain features
        features.update(self._frequency_features(accel_magnitude, "accel_magnitude"))
        
        # Cross-axis features
        features.update(self._cross_axis_features(accel_x, accel_y, accel_z))
        
        # Peak features
        features.update(self._peak_features(accel_magnitude, "accel_magnitude"))
        
        return features
    
    def _extract_gyroscope_features(self, window: List[SensorData]) -> Dict[str, float]:
        """Extract features from gyroscope data."""
        # Check if any gyroscope data is available
        if not any(w.gyroscope_x is not None for w in window):
            # Return default values when gyroscope data is not available
            return {
                'gyro_x_mean': 0.0, 'gyro_x_std': 0.0, 'gyro_x_min': 0.0, 'gyro_x_max': 0.0,
                'gyro_y_mean': 0.0, 'gyro_y_std': 0.0, 'gyro_y_min': 0.0, 'gyro_y_max': 0.0,
                'gyro_z_mean': 0.0, 'gyro_z_std': 0.0, 'gyro_z_min': 0.0, 'gyro_z_max': 0.0,
                'gyro_magnitude_mean': 0.0, 'gyro_magnitude_std': 0.0, 'gyro_magnitude_min': 0.0, 'gyro_magnitude_max': 0.0,
                'gyro_magnitude_fft_peak': 0.0, 'gyro_magnitude_fft_energy': 0.0
            }
        
        gyro_x = [w.gyroscope_x or 0 for w in window]
        gyro_y = [w.gyroscope_y or 0 for w in window]
        gyro_z = [w.gyroscope_z or 0 for w in window]
        
        gyro_magnitude = [math.sqrt(x**2 + y**2 + z**2) for x, y, z in zip(gyro_x, gyro_y, gyro_z)]
        
        features = {}
        
        # Statistical features
        features.update(self._statistical_features(gyro_x, "gyro_x"))
        features.update(self._statistical_features(gyro_y, "gyro_y"))
        features.update(self._statistical_features(gyro_z, "gyro_z"))
        features.update(self._statistical_features(gyro_magnitude, "gyro_magnitude"))
        
        # Frequency domain features
        features.update(self._frequency_features(gyro_magnitude, "gyro_magnitude"))
        
        return features
    
    def _extract_gps_features(self, window: List[SensorData]) -> Dict[str, float]:
        """Extract features from GPS data."""
        # Filter out None values
        valid_points = [w for w in window if w.latitude is not None and w.longitude is not None]
        
        if len(valid_points) < 2:
            # Return default values when GPS data is insufficient
            return {
                'gps_speed_mean': 0.0,
                'gps_speed_std': 0.0,
                'gps_speed_max': 0.0,
                'gps_heading_mean': 0.0,
                'gps_heading_std': 0.0,
                'gps_distance_total': 0.0,
                'gps_distance_mean': 0.0,
                'gps_velocity_mean': 0.0,
                'gps_acceleration_mean': 0.0
            }
        
        latitudes = [w.latitude for w in valid_points]
        longitudes = [w.longitude for w in valid_points]
        speeds = [w.speed or 0 for w in valid_points]
        headings = [w.heading or 0 for w in valid_points]
        
        features = {}
        
        # Speed features
        features.update(self._statistical_features(speeds, "speed"))
        
        # Heading features
        features.update(self._statistical_features(headings, "heading"))
        
        # Distance and displacement features
        features.update(self._distance_features(latitudes, longitudes))
        
        return features
    
    def _statistical_features(self, data: List[float], prefix: str) -> Dict[str, float]:
        """Calculate statistical features for a data series."""
        if not data:
            return {}
        
        features = {}
        data_array = np.array(data)
        
        # Handle NaN values by replacing with 0
        data_array = np.nan_to_num(data_array, nan=0.0)
        
        # Basic statistics
        features[f"{prefix}_mean"] = float(np.mean(data_array))
        features[f"{prefix}_std"] = float(np.std(data_array))
        features[f"{prefix}_min"] = float(np.min(data_array))
        features[f"{prefix}_max"] = float(np.max(data_array))
        features[f"{prefix}_range"] = float(np.max(data_array) - np.min(data_array))
        features[f"{prefix}_median"] = float(np.median(data_array))
        
        # Percentiles
        features[f"{prefix}_q25"] = float(np.percentile(data_array, 25))
        features[f"{prefix}_q75"] = float(np.percentile(data_array, 75))
        features[f"{prefix}_iqr"] = float(np.percentile(data_array, 75) - np.percentile(data_array, 25))
        
        # Skewness and kurtosis
        features[f"{prefix}_skewness"] = float(stats.skew(data_array))
        features[f"{prefix}_kurtosis"] = float(stats.kurtosis(data_array))
        
        # Zero crossing rate
        features[f"{prefix}_zero_crossing_rate"] = float(np.sum(np.diff(np.signbit(data_array))) / len(data_array))
        
        return features
    
    def _frequency_features(self, data: List[float], prefix: str) -> Dict[str, float]:
        """Calculate frequency domain features."""
        if len(data) < 4:
            return {}
        
        # Handle NaN values by replacing with 0
        data = [0.0 if np.isnan(x) else x for x in data]
        
        # FFT
        fft = np.fft.fft(data)
        fft_magnitude = np.abs(fft)
        
        # Power spectral density
        psd = np.abs(fft) ** 2
        
        features = {}
        
        # Spectral features
        features[f"{prefix}_spectral_centroid"] = float(np.sum(psd * np.arange(len(psd))) / np.sum(psd))
        features[f"{prefix}_spectral_rolloff"] = float(np.percentile(np.cumsum(psd), 85))
        features[f"{prefix}_spectral_bandwidth"] = float(np.sqrt(np.sum(psd * (np.arange(len(psd)) - features[f"{prefix}_spectral_centroid"]) ** 2) / np.sum(psd)))
        
        # Dominant frequency
        dominant_freq_idx = np.argmax(fft_magnitude[1:len(fft_magnitude)//2]) + 1
        features[f"{prefix}_dominant_frequency"] = float(dominant_freq_idx)
        
        return features
    
    def _cross_axis_features(self, x: List[float], y: List[float], z: List[float]) -> Dict[str, float]:
        """Calculate cross-axis correlation features."""
        features = {}
        
        if len(x) > 1:
            features["accel_xy_correlation"] = float(np.corrcoef(x, y)[0, 1])
            features["accel_xz_correlation"] = float(np.corrcoef(x, z)[0, 1])
            features["accel_yz_correlation"] = float(np.corrcoef(y, z)[0, 1])
        
        return features
    
    def _peak_features(self, data: List[float], prefix: str) -> Dict[str, float]:
        """Calculate peak-related features."""
        if len(data) < 3:
            return {}
        
        data_array = np.array(data)
        
        # Find peaks
        peaks, _ = self._find_peaks(data_array)
        
        features = {}
        features[f"{prefix}_peak_count"] = float(len(peaks))
        
        if len(peaks) > 0:
            features[f"{prefix}_peak_mean"] = float(np.mean(data_array[peaks]))
            features[f"{prefix}_peak_std"] = float(np.std(data_array[peaks]))
        
        return features
    
    def _find_peaks(self, data: np.ndarray, height: float = None) -> Tuple[np.ndarray, Dict]:
        """Find peaks in the data."""
        from scipy.signal import find_peaks
        
        if height is None:
            height = np.mean(data) + np.std(data)
        
        return find_peaks(data, height=height)
    
    def _distance_features(self, latitudes: List[float], longitudes: List[float]) -> Dict[str, float]:
        """Calculate distance and displacement features."""
        if len(latitudes) < 2:
            return {}
        
        features = {}
        
        # Calculate distances between consecutive points
        distances = []
        for i in range(1, len(latitudes)):
            dist = self._haversine_distance(
                latitudes[i-1], longitudes[i-1],
                latitudes[i], longitudes[i]
            )
            distances.append(dist)
        
        if distances:
            features["gps_total_distance"] = float(np.sum(distances))
            features["gps_mean_distance"] = float(np.mean(distances))
            features["gps_distance_std"] = float(np.std(distances))
            
            # Displacement (straight-line distance from start to end)
            displacement = self._haversine_distance(
                latitudes[0], longitudes[0],
                latitudes[-1], longitudes[-1]
            )
            features["gps_displacement"] = float(displacement)
            
            # Efficiency (displacement / total distance)
            if features["gps_total_distance"] > 0:
                features["gps_efficiency"] = float(displacement / features["gps_total_distance"])
        
        return features
    
    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
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