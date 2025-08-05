import MotionSensorTest from '@/components/MotionSensorTest';

export default function TestMotionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Motion Sensor Test
          </h1>
          <p className="text-gray-600">
            Test and demonstrate device motion sensors for transport mode detection.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <MotionSensorTest />
          
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Instructions</h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold text-lg mb-2">Getting Started</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Click "Request Permission" to enable motion sensors</li>
                  <li>Click "Start Listening" to begin collecting sensor data</li>
                  <li>Move your device to see real-time accelerometer and gyroscope data</li>
                  <li>Observe the statistical features for transport mode detection</li>
                </ol>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-2">What You'll See</h3>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li><strong>Accelerometer:</strong> X, Y, Z acceleration values and magnitude</li>
                  <li><strong>Gyroscope:</strong> X, Y, Z rotation rates and magnitude</li>
                  <li><strong>Device Orientation:</strong> Alpha, Beta, Gamma angles (if enabled)</li>
                  <li><strong>Statistical Features:</strong> Mean, standard deviation, and range values</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-2">Transport Mode Detection</h3>
                <p className="text-sm">
                  The motion sensor data is used to detect different transport modes:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                  <li><strong>Walking:</strong> Regular acceleration patterns, moderate rotation</li>
                  <li><strong>Bus:</strong> Smooth acceleration, occasional stops and starts</li>
                  <li><strong>Train:</strong> Very smooth motion, minimal rotation</li>
                  <li><strong>Tram:</strong> Smooth motion with regular stops</li>
                  <li><strong>Still:</strong> Minimal acceleration and rotation</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-2">Browser Compatibility</h3>
                <p className="text-sm">
                  Motion sensors work best on mobile devices. Some browsers may require HTTPS for sensor access.
                  iOS devices require explicit permission for motion sensors.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 