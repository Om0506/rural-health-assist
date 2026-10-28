import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { FaSearch, FaUpload, FaUser, FaQrcode } from 'react-icons/fa';
import { qrAPI, userAPI } from '../services/api';
import QRScannerModal from './QRScannerModal';

function PatientIdentifier({ initialPatientId = '', onResolved }) {
  const [patientId, setPatientId] = useState(initialPatientId ? String(initialPatientId) : '');
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialPatientId) {
      setPatientId(String(initialPatientId));
    }
  }, [initialPatientId]);

  const resolveAndLoadPatient = async (qrData) => {
    const qrRes = await qrAPI.resolveScan(qrData);
    const resolvedId = qrRes.data?.patient?.id;
    if (!resolvedId) throw new Error('Could not resolve patient');
    const userRes = await userAPI.getUser(resolvedId);
    setPatientId(String(resolvedId));
    setPatient(userRes.data);
    onResolved?.({ id: resolvedId, profile: userRes.data });
    return resolvedId;
  };

  const handleSearchById = async () => {
    if (!patientId) return;
    setLoading(true);
    setError('');
    try {
      const userRes = await userAPI.getUser(patientId);
      setPatient(userRes.data);
      onResolved?.({ id: Number(patientId), profile: userRes.data });
    } catch (err) {
      setError('Patient not found. Check patient ID and try again.');
      setPatient(null);
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = async (decodedText) => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await resolveAndLoadPatient(decodedText);
      setShowScanner(false);
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to read this QR. Try another code.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    const reader = new Html5Qrcode('rha-hidden-file-scanner');
    try {
      const decodedText = await reader.scanFile(file, true);
      await resolveAndLoadPatient(decodedText);
    } catch (err) {
      setError('Could not scan QR from image. Please upload a clear QR image.');
    } finally {
      event.target.value = '';
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-default bg-card-secondary p-4">
      <div className="flex items-center gap-2 mb-3 text-gray-800">
        <FaUser className="text-blue-600" />
        <h3 className="font-semibold">Identify Patient</h3>
      </div>

      <div id="rha-hidden-file-scanner" className="hidden" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        <button type="button" onClick={() => setShowScanner(true)} className="inline-flex justify-center items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          <FaQrcode />
          Scan QR
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex justify-center items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
          <FaUpload />
          Upload QR Image
        </button>
        <button type="button" onClick={handleSearchById} disabled={!patientId || loading} className="inline-flex justify-center items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
          <FaSearch />
          Search by ID
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleUploadImage}
        className="hidden"
      />

      <input
        type="number"
        placeholder="Enter Patient ID manually"
        value={patientId}
        onChange={(e) => setPatientId(e.target.value)}
        className="input-field"
      />

      {loading && <p className="text-sm text-blue-700 mt-2">Fetching patient details...</p>}
      {!!error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {patient && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
          <p className="font-semibold text-gray-800">{patient.name}</p>
          <p className="text-gray-600">Patient ID: {patient.id}</p>
          <p className="text-gray-600">Phone: {patient.phone || '-'}</p>
        </div>
      )}

      <QRScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
        loading={loading}
        error={error}
      />
    </div>
  );
}

export default PatientIdentifier;
