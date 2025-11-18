import { useState, useEffect } from 'react';
import { healthAPI } from '../services/api';
import Chatbot from '../components/Chatbot';
import QRCard from '../components/QRCard';
import NotificationPanel from '../components/NotificationPanel';
import { FaHeartbeat, FaCalendar } from 'react-icons/fa';

function VillagerDashboard({ userProfile }) {
  const [healthRecords, setHealthRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chatbot');

  useEffect(() => {
    if (userProfile) {
      loadHealthRecords();
    }
  }, [userProfile]);

  const loadHealthRecords = async () => {
    try {
      const response = await healthAPI.getRecords(userProfile.id);
      setHealthRecords(response.data);
    } catch (error) {
      console.error('Error loading health records:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Welcome, {userProfile.name}!
          </h1>
          <p className="text-gray-600">Manage your health records and get instant health advice</p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('chatbot')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === 'chatbot'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            AI Chatbot
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === 'records'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Health Records
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === 'qr'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            QR Health Card
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === 'notifications'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Notifications
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {activeTab === 'chatbot' && (
              <div className="h-[600px]">
                <Chatbot userId={userProfile.id} />
              </div>
            )}

            {activeTab === 'records' && (
              <div className="card">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center space-x-2">
                  <FaHeartbeat className="text-primary" />
                  <span>My Health Records</span>
                </h2>

                {loading ? (
                  <p className="text-gray-500">Loading records...</p>
                ) : healthRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <FaHeartbeat className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No health records yet</p>
                    <p className="text-gray-400 text-sm mt-2">
                      Your ASHA worker will add records after your health checkup
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {healthRecords.map((record) => (
                      <div key={record.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2 text-gray-600">
                            <FaCalendar />
                            <span className="text-sm">
                              {new Date(record.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {record.vitals && (
                          <div className="mb-3">
                            <h4 className="font-semibold text-gray-700 mb-2">Vitals:</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {record.vitals.temperature && (
                                <div className="bg-white p-2 rounded">
                                  <p className="text-xs text-gray-500">Temperature</p>
                                  <p className="font-bold text-primary">{record.vitals.temperature}°F</p>
                                </div>
                              )}
                              {record.vitals.blood_pressure && (
                                <div className="bg-white p-2 rounded">
                                  <p className="text-xs text-gray-500">BP</p>
                                  <p className="font-bold text-secondary">{record.vitals.blood_pressure}</p>
                                </div>
                              )}
                              {record.vitals.pulse && (
                                <div className="bg-white p-2 rounded">
                                  <p className="text-xs text-gray-500">Pulse</p>
                                  <p className="font-bold text-accent">{record.vitals.pulse} bpm</p>
                                </div>
                              )}
                              {record.vitals.weight && (
                                <div className="bg-white p-2 rounded">
                                  <p className="text-xs text-gray-500">Weight</p>
                                  <p className="font-bold text-green-600">{record.vitals.weight} kg</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {record.notes && (
                          <div className="bg-white p-3 rounded">
                            <h4 className="font-semibold text-gray-700 mb-1">Notes:</h4>
                            <p className="text-gray-600 text-sm">{record.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'qr' && (
              <QRCard userId={userProfile.id} userName={userProfile.name} />
            )}

            {activeTab === 'notifications' && (
              <NotificationPanel userId={userProfile.id} />
            )}
          </div>

          <div className="space-y-6">
            <div className="card bg-gradient-to-br from-primary to-green-600 text-white">
              <h3 className="text-xl font-bold mb-3">Quick Stats</h3>
              <div className="space-y-3">
                <div className="bg-white bg-opacity-20 p-3 rounded">
                  <p className="text-sm text-green-100">Total Records</p>
                  <p className="text-3xl font-bold">{healthRecords.length}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded">
                  <p className="text-sm text-green-100">Account Status</p>
                  <p className="text-lg font-semibold">Active</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-xl font-bold mb-3 text-gray-800">Health Tips</h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Drink at least 8 glasses of water daily</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Get 7-8 hours of sleep every night</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Eat fresh fruits and vegetables</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Exercise for 30 minutes daily</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>Wash hands frequently to prevent infections</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VillagerDashboard;
