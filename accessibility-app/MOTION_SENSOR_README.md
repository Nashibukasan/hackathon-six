# Motion Sensor Implementation - Phase 3.2

This document describes the implementation of device motion sensors for transport mode detection in the accessibility transport tracking application.

## Overview

The motion sensor implementation provides real-time access to device accelerometer and gyroscope data for transport mode detection. It includes:

- **MotionService**: Core service for accessing device motion sensors
- **DataPreprocessingService**: Utility for processing sensor data into features
- **MotionSensorTest**: React component for testing and demonstration
- **Integration with LocationService**: Combined location and motion data collection

## Files Created/Modified

### New Files
- `src/lib/motionService.ts` - Core motion sensor service
- `src/lib/dataPreprocessing.ts` - Data preprocessing utilities
- `src/components/MotionSensorTest.tsx` - Test component
- `src/app/test-motion/page.tsx` - Test page

### Modified Files
- `src/types/index.ts` - Added motion sensor types
- `src/lib/locationService.ts` - Integrated motion sensor data collection

## Key Features

### MotionService
- **Device Motion API**: Uses Web Device Motion API for accelerometer and gyroscope data
- **Permission Handling**: Supports iOS 13+ motion sensor permissions
- **Battery Optimization**: Throttled updates to minimize battery impact
- **Data Buffering**: Maintains a buffer of recent sensor readings
- **Statistical Analysis**: Calculates mean, standard deviation, and range values

### DataPreprocessingService
- **Feature Extraction**: Converts raw sensor data into transport mode detection features
- **Statistical Features**: Calculates comprehensive statistical measures
- **Data Buffering**: Maintains processed data for analysis
- **Circular Statistics**: Handles heading data with proper circular statistics

### MotionSensorTest Component
- **Real-time Display**: Shows live accelerometer and gyroscope data
- **Permission Management**: Handles motion sensor permission requests
- **Statistical Visualization**: Displays calculated features
- **Buffer Management**: Shows data buffer status and controls

## Usage

### Testing the Motion Sensors

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the test page**:
   ```
   http://localhost:3000/test-motion
   ```

3. **Request permission**:
   - Click "Request Permission" to enable motion sensors
   - On iOS devices, this will prompt for motion sensor access

4. **Start listening**:
   - Click "Start Listening" to begin collecting sensor data
   - Move your device to see real-time data updates

5. **Observe the data**:
   - Real-time accelerometer and gyroscope values
   - Statistical features for transport mode detection
   - Buffer status and data processing

### Integration with Location Tracking

The motion service is automatically integrated with location tracking:

```typescript
import { locationService } from '@/lib/locationService';
import { motionService } from '@/lib/motionService';

// Start combined tracking
await locationService.startTracking();

// Location updates now include motion sensor data
locationService.setCallbacks((location, sensorData) => {
  console.log('Location:', location);
  console.log('Motion:', sensorData);
});
```

## Transport Mode Detection Features

The system calculates the following features for transport mode detection:

### Accelerometer Features
- **Mean Acceleration**: Average acceleration magnitude
- **Std Acceleration**: Standard deviation of acceleration
- **Acceleration Range**: Range of acceleration values

### Gyroscope Features
- **Mean Rotation**: Average rotation magnitude
- **Std Rotation**: Standard deviation of rotation
- **Rotation Range**: Range of rotation values

### Combined Features
- **Mean Speed**: Average speed from GPS
- **Std Speed**: Speed variability
- **Speed Range**: Speed range
- **Heading Variance**: Directional consistency

## Browser Compatibility

### Supported Browsers
- **Chrome**: Full support for device motion
- **Safari**: Full support (requires HTTPS on iOS)
- **Firefox**: Full support
- **Edge**: Full support

### Mobile Devices
- **iOS**: Requires explicit permission for motion sensors (iOS 13+)
- **Android**: Generally works without explicit permission
- **HTTPS Required**: Motion sensors require secure context on most browsers

## API Reference

### MotionService

```typescript
class MotionService {
  // Check if motion sensors are supported
  isSupported(): boolean

  // Get current status
  getStatus(): MotionStatus

  // Set callbacks for data updates
  setCallbacks(
    onMotionUpdate: (sensorData: SensorData) => void,
    onError?: (error: Error) => void,
    onStatusChange?: (status: MotionStatus) => void
  )

  // Request permission
  async requestPermission(): Promise<boolean>

  // Start listening to sensors
  async startListening(): Promise<boolean>

  // Stop listening
  stopListening(): void

  // Get current sensor data
  getCurrentSensorData(): SensorData | null

  // Get buffered data
  getBufferedData(): SensorData[]

  // Get statistical features
  getStatisticalFeatures(): StatisticalFeatures

  // Clear data buffer
  clearBuffer(): void
}
```

### DataPreprocessingService

```typescript
class DataPreprocessingService {
  // Add and process a new data point
  addDataPoint(locationData?: LocationData, sensorData?: SensorData): ProcessedDataPoint

  // Get statistical features
  getStatisticalFeatures(): StatisticalFeatures

  // Get recent data points
  getRecentDataPoints(count?: number): ProcessedDataPoint[]

  // Check if enough data for analysis
  hasEnoughData(minSamples?: number): boolean

  // Clear the buffer
  clearBuffer(): void
}
```

## Transport Mode Detection Patterns

Based on the collected features, the system can identify different transport modes:

### Walking
- **Acceleration**: Regular patterns, moderate magnitude
- **Rotation**: Moderate rotation during turns
- **Speed**: 1-2 m/s, variable
- **Heading**: Frequent changes

### Bus
- **Acceleration**: Smooth, occasional stops/starts
- **Rotation**: Minimal rotation
- **Speed**: 5-15 m/s, relatively constant
- **Heading**: Gradual changes

### Train
- **Acceleration**: Very smooth, minimal variation
- **Rotation**: Minimal rotation
- **Speed**: 10-30 m/s, very constant
- **Heading**: Very gradual changes

### Tram
- **Acceleration**: Smooth with regular stops
- **Rotation**: Minimal rotation
- **Speed**: 5-20 m/s, stops frequently
- **Heading**: Gradual changes

### Still
- **Acceleration**: Minimal, near gravity only
- **Rotation**: Minimal rotation
- **Speed**: 0 m/s
- **Heading**: No changes

## Next Steps

This implementation provides the foundation for Phase 4 (AI Core - Transport Mode Detection). The next phase will:

1. **Implement ML Model**: Create a machine learning model using the collected features
2. **GTFS Integration**: Add real-time vehicle position data
3. **Hybrid Inference**: Combine sensor-based detection with GTFS data
4. **Confidence Scoring**: Implement confidence measures for predictions

## Troubleshooting

### Motion Sensors Not Working
1. **Check HTTPS**: Ensure you're using HTTPS (required for motion sensors)
2. **Check Permissions**: Verify motion sensor permissions are granted
3. **Check Device**: Ensure your device has motion sensors
4. **Check Browser**: Try a different browser if issues persist

### Permission Denied
- **iOS**: Motion sensors require explicit permission on iOS 13+
- **Browser Settings**: Check browser settings for motion sensor access
- **HTTPS**: Motion sensors require secure context

### No Data Updates
- **Device Movement**: Ensure the device is moving to see data changes
- **Buffer Size**: Check if the buffer is being cleared
- **Throttling**: Data is throttled for battery optimization

## Performance Considerations

- **Battery Impact**: Motion sensors can impact battery life
- **Throttling**: Updates are throttled to 10Hz for battery optimization
- **Buffer Size**: Default buffer size is 50 samples
- **Memory Usage**: Large buffers can impact memory usage

## Security and Privacy

- **Local Processing**: All sensor data is processed locally
- **No External Transmission**: Sensor data is not sent to external servers
- **User Consent**: Requires explicit user consent for motion sensor access
- **Data Retention**: Data is only stored in memory during active tracking 