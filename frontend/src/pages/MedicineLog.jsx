import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { medicineAPI } from '../services/api';
import PatientIdentifier from '../components/PatientIdentifier';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

function MedicineLog() {
  const [searchParams] = useSearchParams();
  const prefilledPatientId = searchParams.get('patientId') || '';
  const [form, setForm] = useState({
    patient_id: prefilledPatientId,
    medicine_name: '',
    quantity: 1,
    notes: ''
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (prefilledPatientId) {
      setForm((prev) => ({ ...prev, patient_id: prefilledPatientId }));
    }
  }, [prefilledPatientId]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const pid = Number(form.patient_id);
      const qty = Number(form.quantity);
      if (!Number.isFinite(pid) || pid <= 0) throw new Error('INVALID_PATIENT');
      if (!String(form.medicine_name || '').trim()) throw new Error('INVALID_MED');
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('INVALID_QTY');

      await medicineAPI.log({
        patient_id: pid,
        medicine_name: form.medicine_name,
        quantity: qty,
        notes: form.notes
      });
      setSaved(true);
      setForm({ patient_id: prefilledPatientId, medicine_name: '', quantity: 1, notes: '' });
    } catch (err) {
      console.error(err);
      if (err?.message === 'INVALID_PATIENT') setError('Please enter a valid Patient ID.');
      else if (err?.message === 'INVALID_MED') setError('Please enter a medicine name.');
      else if (err?.message === 'INVALID_QTY') setError('Quantity must be at least 1.');
      else setError(err?.response?.data?.error || 'Failed to save medicine log. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container max-w-2xl">
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-semibold text-fg">Medicine Distribution Log</h1>
          <Link to="/dashboard/asha" className="text-sm text-brand-600 hover:underline font-medium">
            Back to dashboard
          </Link>
        </div>
        {prefilledPatientId && (
          <p className="mb-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
            Patient selected from QR: <span className="font-semibold">ID {prefilledPatientId}</span>
          </p>
        )}
        {error && (
          <div className="mb-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-400" role="alert">
            {error}
          </div>
        )}
        {saved && <p className="text-emerald-700 text-sm mb-3">Medicine log saved.</p>}
        <form onSubmit={submit} className="space-y-3">
          {!prefilledPatientId ? (
            <PatientIdentifier
              initialPatientId={form.patient_id}
              onResolved={({ id }) => setForm((prev) => ({ ...prev, patient_id: String(id) }))}
            />
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Patient is already selected from previous screen. Using Patient ID: <span className="font-semibold">{prefilledPatientId}</span>
            </div>
          )}
          <input
            className="input-field"
            placeholder="Patient ID"
            value={form.patient_id}
            onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
            readOnly={Boolean(prefilledPatientId)}
            required
          />
          <input className="input-field" placeholder="Medicine Name" value={form.medicine_name} onChange={(e) => setForm({ ...form, medicine_name: e.target.value })} required />
          <input type="number" min="1" className="input-field" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          <textarea rows={3} className="input-field" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button type="submit" loading={saving} className="w-full">
            {saving ? 'Saving…' : 'Save Log'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default MedicineLog;
