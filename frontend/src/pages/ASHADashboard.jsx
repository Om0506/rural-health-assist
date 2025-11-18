import { useState, useEffect } from 'react';
import { healthAPI, flagAPI, userAPI } from '../services/api';
import { FaUserInjured, FaFlag, FaPlusCircle } from 'react-icons/fa';

function ASHADashboard({ userProfile }) {
  const [flaggedCases, setFlaggedCases] = useState([]);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showFlagCase, setShowFlagCase] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [recordForm, setRecordForm] = useState({
    userId: '',
    temperature: '',
    blood_pressure: '',
    pulse: '',
    weight: '',
    notes: ''
  });

  const [flagForm, setFlagForm] = useState({
    userId: '',
    reason: '',
    severity: 'moderate'
  });

  useEffect(() => {
    loadFlaggedCases();
  }, []);

  const loadFlaggedCases = async () => {
    try {
      const response = await flagAPI.getAllFlagged();
      setFlaggedCases(response.data);
    } catch (error) {
      console.error('Error loading flagged cases:', error);
    }
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const vitals = {
        temperature: recordForm.temperature,
        blood_pressure: recordForm.blood_pressure,
        pulse: recordForm.pulse,
        weight: recordForm.weight
      };

      await healthAPI.addRecord({
        userId: recordForm.userId,
        vitals,
        notes: recordForm.notes
      });

      alert('Health record added successfully!');
      setShowAddRecord(false);
      setRecordForm({
        userId: '',
        temperature: '',
        blood_pressure: '',
        pulse: '',
        weight: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error adding record:', error);
      alert('Failed to add health record');
    } finally {
      setLoading(false);
    }
  };

  const handleFlagSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await flagAPI.flagCase(flagForm.userId, {
        reason: flagForm.reason,
        severity: flagForm.severity
      });

      alert('Case flagged successfully!');
      setShowFlagCase(false);
      setFlagForm({ userId: '', reason: '', severity: 'moderate' });
      loadFlaggedCases();
    } catch (error) {
      console.error('Error flagging case:', error);
      alert('Failed to flag case');
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
            ASHA Worker Dashboard
          </h1>
          <p className="text-gray-600">Manage patient records and monitor flagged cases</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setShowAddRecord(!showAddRecord)}
            className="btn-primary flex items-center justify-center space-x-2"
          >
            <FaPlusCircle />
            <span>Add Health Record</span>
          </button>
          <button
            onClick={() => setShowFlagCase(!showFlagCase)}
            className="btn-secondary flex items-center justify-center space-x-2"
          >
            <FaFlag />
            <span>Flag a Case</span>
          </button>
        </div>

        {showAddRecord && (
          <div className="card mb-6 bg-green-50 border-2 border-primary">
            <h3 className="text-2xl font-bold mb-4 text-gray-800 flex items-center space-x-2">
              <FaUserInjured className="text-primary" />
              <span>Add Health Record</span>
            </h3>
            <form onSubmit={handleRecordSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Patient User ID *
                  </label>
                  <input
                    type="number"
                    required
                    value={recordForm.userId}
                    onChange={(e) => setRecordForm({...recordForm, userId: e.target.value})}
                    className="input-field"
                    placeholder="Enter patient user ID"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Temperature (°F)
                  </label>
                  <input
                    type="text"
                    value={recordForm.temperature}
                    onChange={(e) => setRecordForm({...recordForm, temperature: e.target.value})}
                    className="input-field"
                    placeholder="e.g., 98.6"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Blood Pressure
                  </label>
                  <input
                    type="text"
                    value={recordForm.blood_pressure}
                    onChange={(e) => setRecordForm({...recordForm, blood_pressure: e.target.value})}
                    className="input-field"
                    placeholder="e.g., 120/80"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Pulse (bpm)
                  </label>
                  <input
                    type="text"
                    value={recordForm.pulse}
                    onChange={(e) => setRecordForm({...recordForm, pulse: e.target.value})}
                    className="input-field"
                    placeholder="e.g., 72"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="text"
                    value={recordForm.weight}
                    onChange={(e) => setRecordForm({...recordForm, weight: e.target.value})}
                    className="input-field"
                    placeholder="e.g., 65"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Notes
                </label>
                <textarea
                  value={recordForm.notes}
                  onChange={(e) => setRecordForm({...recordForm, notes: e.target.value})}
                  className="input-field resize-none"
                  rows="3"
                  placeholder="Additional notes or observations"
                ></textarea>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Record'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddRecord(false)}
                  className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {showFlagCase && (
          <div className="card mb-6 bg-red-50 border-2 border-red-400">
            <h3 className="text-2xl font-bold mb-4 text-gray-800 flex items-center space-x-2">
              <FaFlag className="text-red-500" />
              <span>Flag a Case</span>
            </h3>
            <form onSubmit={handleFlagSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Patient User ID *
                </label>
                <input
                  type="number"
                  required
                  value={flagForm.userId}
                  onChange={(e) => setFlagForm({...flagForm, userId: e.target.value})}
                  className="input-field"
                  placeholder="Enter patient user ID"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Reason for Flagging *
                </label>
                <textarea
                  required
                  value={flagForm.reason}
                  onChange={(e) => setFlagForm({...flagForm, reason: e.target.value})}
                  className="input-field resize-none"
                  rows="3"
                  placeholder="Describe the health concern or reason for flagging"
                ></textarea>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Severity *
                </label>
                <select
                  required
                  value={flagForm.severity}
                  onChange={(e) => setFlagForm({...flagForm, severity: e.target.value})}
                  className="input-field"
                >
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-secondary disabled:opacity-50"
                >
                  {loading ? 'Flagging...' : 'Flag Case'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFlagCase(false)}
                  className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center space-x-2">
            <FaFlag className="text-red-500" />
            <span>Flagged Cases</span>
          </h2>

          {flaggedCases.length === 0 ? (
            <div className="text-center py-12">
              <FaFlag className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No flagged cases</p>
              <p className="text-gray-400 text-sm mt-2">
                Cases flagged for attention will appear here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {flaggedCases.map((flaggedCase) => (
                <div
                  key={flaggedCase.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    flaggedCase.severity === 'critical'
                      ? 'bg-red-50 border-red-500'
                      : flaggedCase.severity === 'high'
                      ? 'bg-orange-50 border-orange-500'
                      : flaggedCase.severity === 'moderate'
                      ? 'bg-yellow-50 border-yellow-500'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-bold text-gray-800">{flaggedCase.name}</h4>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            flaggedCase.severity === 'critical'
                              ? 'bg-red-500 text-white'
                              : flaggedCase.severity === 'high'
                              ? 'bg-orange-500 text-white'
                              : flaggedCase.severity === 'moderate'
                              ? 'bg-yellow-500 text-white'
                              : 'bg-blue-500 text-white'
                          }`}
                        >
                          {flaggedCase.severity?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{flaggedCase.reason}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>Phone: {flaggedCase.phone}</span>
                        <span>User ID: {flaggedCase.user_id}</span>
                        <span>Date: {new Date(flaggedCase.date).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ASHADashboard;
