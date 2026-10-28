import { useState } from 'react';
import { flagAPI } from '../services/api';
import PatientIdentifier from './PatientIdentifier';
import Button from './ui/Button';

function FlagCaseModal({ patientId, onClose, onFlagged }) {
  const [selectedPatientId, setSelectedPatientId] = useState(patientId ? String(patientId) : '');
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const pid = Number(selectedPatientId);
      if (!Number.isFinite(pid) || pid <= 0) {
        setError('Please enter a valid Patient ID.');
        return;
      }
      if (!String(reason || '').trim()) {
        setError('Please enter a reason for flagging.');
        return;
      }
      await flagAPI.createFlag({ patient_id: Number(selectedPatientId), reason, severity });
      setSuccess('Case flagged successfully.');
      onFlagged?.();
      onClose?.();
    } catch (error) {
      console.error(error);
      setError(error?.response?.data?.error || 'Failed to flag case. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="card w-full max-w-md space-y-4 shadow-dark-card">
        <h3 className="text-lg font-semibold text-fg">Flag Case</h3>
        {error ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-400" role="alert">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-200">
            {success}
          </div>
        ) : null}
        {!patientId ? (
          <PatientIdentifier
            initialPatientId={selectedPatientId}
            onResolved={({ id }) => setSelectedPatientId(String(id))}
          />
        ) : (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
            Patient is already selected from previous screen. Using Patient ID:{' '}
            <span className="font-semibold">{selectedPatientId}</span>
          </div>
        )}
        <input
          type="number"
          className="input-field"
          placeholder="Patient ID"
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          readOnly={Boolean(patientId)}
          required
        />
        <textarea
          className="input-field resize-none"
          rows={4}
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
        <select className="input-field" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="low">Low</option>
          <option value="moderate">Moderate</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={saving}>
            Flag
          </Button>
        </div>
      </form>
    </div>
  );
}

export default FlagCaseModal;
