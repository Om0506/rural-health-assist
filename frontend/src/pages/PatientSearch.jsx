import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaUser } from 'react-icons/fa';
import PatientIdentifier from '../components/PatientIdentifier';

function PatientSearch() {
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState(null);

  return (
    <div className="page-container">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="card">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaSearch className="text-indigo-600" />
            Patient Search
          </h1>
          <p className="text-sm text-gray-600 mt-1">Find patient by scanning QR, uploading QR image, or entering patient ID manually.</p>
          <div className="mt-4">
            <PatientIdentifier onResolved={(patient) => setSelectedPatient(patient)} />
          </div>
        </div>

        {selectedPatient?.profile && (
          <div className="card border border-indigo-100">
            <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <FaUser className="text-indigo-600" />
              Patient Found
            </h2>
            <p className="text-sm text-gray-700">Name: {selectedPatient.profile.name}</p>
            <p className="text-sm text-gray-700">Patient ID: {selectedPatient.profile.id}</p>
            <p className="text-sm text-gray-700">Village: {selectedPatient.profile.village_name || '-'}</p>
            <button
              type="button"
              onClick={() => navigate(`/patient/${selectedPatient.profile.id}`)}
              className="mt-3 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Open Patient Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientSearch;
