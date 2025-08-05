import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-soft p-8">
            <h1 className="text-3xl font-bold text-primary-900 mb-6">About Accessibility Transport Tracker</h1>
            
            <div className="prose prose-lg max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
                <p className="text-gray-700 mb-4">
                  The Accessibility Transport Tracker is a web-based application designed to improve public transport accessibility for people with disabilities. Our mission is to collect real-world journey data to identify accessibility challenges and provide actionable insights for transport network improvements.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">How It Works</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-primary-50 rounded-lg">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Track Journeys</h3>
                    <p className="text-sm text-gray-600">Users track their transport journeys using GPS and motion sensors</p>
                  </div>
                  <div className="text-center p-4 bg-success-50 rounded-lg">
                    <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Analyze Data</h3>
                    <p className="text-sm text-gray-600">AI algorithms analyze journey patterns and identify accessibility issues</p>
                  </div>
                  <div className="text-center p-4 bg-warning-50 rounded-lg">
                    <div className="w-12 h-12 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Generate Insights</h3>
                    <p className="text-sm text-gray-600">Provide actionable insights to improve transport accessibility</p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Key Features</h2>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li><strong>Real-time Journey Tracking:</strong> Track your transport journeys with GPS and motion sensors</li>
                  <li><strong>Accessibility Profile System:</strong> Personalized tracking based on your accessibility needs</li>
                  <li><strong>Transport Mode Detection:</strong> AI-powered detection of transport modes (bus, train, walking)</li>
                  <li><strong>Privacy-First Design:</strong> Granular consent controls and data anonymization</li>
                  <li><strong>Accessibility Dashboard:</strong> Visual insights and analytics for transport accessibility</li>
                  <li><strong>Data Export:</strong> Export your journey data and insights</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Technology Stack</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Frontend</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Next.js with TypeScript</li>
                      <li>Tailwind CSS for styling</li>
                      <li>React Context for state management</li>
                      <li>Leaflet.js for interactive maps</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Backend</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>Next.js API routes</li>
                      <li>SQLite database</li>
                      <li>Python ML pipeline</li>
                      <li>GTFS data integration</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Privacy & Security</h2>
                <p className="text-gray-700 mb-4">
                  We are committed to protecting your privacy and ensuring your data is secure. Our application features:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>End-to-end encryption for all data</li>
                  <li>Granular consent controls for data collection</li>
                  <li>Data anonymization before analysis</li>
                  <li>GDPR-compliant data handling</li>
                  <li>Regular security audits and updates</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get Involved</h2>
                <p className="text-gray-700 mb-6">
                  Join us in making public transport more accessible for everyone. Your journey data helps identify and address accessibility challenges in transport networks.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link 
                    href="/onboarding"
                    className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                  >
                    Start Tracking
                  </Link>
                  <Link 
                    href="/register"
                    className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                  >
                    Create Account
                  </Link>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
                <p className="text-gray-700 mb-4">
                  Have questions or feedback? We'd love to hear from you.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>Email:</strong> support@accessibilitytransport.com<br />
                    <strong>Project:</strong> Accessibility Transport Tracker<br />
                    <strong>Version:</strong> 1.0.0 (Beta)
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 