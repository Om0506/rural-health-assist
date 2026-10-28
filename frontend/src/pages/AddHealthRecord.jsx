import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { healthAPI } from '../services/api';
import PatientIdentifier from '../components/PatientIdentifier';
import Card from '../components/ui/Card';
import Input, { Textarea, Select } from '../components/ui/Input';
import Button from '../components/ui/Button';
import FeedbackBanner from '../components/ui/FeedbackBanner';
import { getApiErrorMessage } from '../utils/apiError';

function validateHealthRecordForm(form) {
  const pid = Number(form.patient_id);
  if (!Number.isFinite(pid) || pid <= 0) return 'Please enter a valid Patient ID.';
  if (form.pulse && !/^\d{1,3}(\s*bpm)?$/i.test(String(form.pulse).trim())) {
    return 'Pulse should be a number (e.g. 80 or 80 bpm).';
  }
  if (form.oxygen_level && !/^\d{1,3}\s*%?$/.test(String(form.oxygen_level).trim())) {
    return 'Oxygen level should be a percentage (e.g. 98 or 98%).';
  }
  return null;
}

function AddHealthRecord() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectedPatientId = params.get('patientId') || '';
  const preselectedCaseId = params.get('caseId') || '';
  const [form, setForm] = useState({
    patient_id: preselectedPatientId,
    temperature: '',
    pulse: '',
    weight: '',
    blood_pressure: '',
    oxygen_level: '',
    symptoms: '',
    medicines_given: '',
    notes: '',
    visit_type: 'home_visit',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const validationError = validateHealthRecordForm(form);
    if (validationError) {
      setError(validationError);
      setSaving(false);
      return;
    }

    try {
      await healthAPI.addRecord({
        patient_id: Number(form.patient_id),
        userId: Number(form.patient_id),
        case_id: preselectedCaseId ? Number(preselectedCaseId) : undefined,
        temperature: form.temperature,
        blood_pressure: form.blood_pressure,
        pulse: form.pulse,
        weight: form.weight,
        oxygen_level: form.oxygen_level,
        vitals: {
          temperature: form.temperature || undefined,
          blood_pressure: form.blood_pressure || undefined,
          pulse: form.pulse || undefined,
          weight: form.weight || undefined,
          oxygen_level: form.oxygen_level || undefined,
        },
        symptoms: form.symptoms,
        medicines_given: form.medicines_given,
        notes: form.notes,
        visit_type: form.visit_type,
      });
      setSuccess('Health record saved successfully.');
      setTimeout(() => navigate(`/patient/${form.patient_id}`), 800);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Failed to add health record. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container dashboard-stack max-w-2xl">
      <Card>
        <FeedbackBanner message={error} variant="error" className="mb-4" />
        <FeedbackBanner message={success} variant="success" className="mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {!preselectedPatientId ? (
            <PatientIdentifier
              initialPatientId={form.patient_id}
              onResolved={({ id }) => setForm((prev) => ({ ...prev, patient_id: String(id) }))}
            />
          ) : (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
              Patient selected: <strong>{preselectedPatientId}</strong>
            </div>
          )}

          <Input
            label="Patient ID"
            value={form.patient_id}
            onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
            required
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Temperature"
              placeholder="e.g. 98.6°F or 37°C"
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: e.target.value })}
            />
            <Input
              label="Pulse"
              placeholder="e.g. 80 bpm"
              value={form.pulse}
              onChange={(e) => setForm({ ...form, pulse: e.target.value })}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Weight"
              placeholder="e.g. 55 kg"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />
            <Input
              label="Blood Pressure"
              placeholder="e.g. 120/80"
              value={form.blood_pressure}
              onChange={(e) => setForm({ ...form, blood_pressure: e.target.value })}
            />
          </div>

          <Input
            label="Oxygen Level (SpO₂)"
            placeholder="e.g. 98%"
            value={form.oxygen_level}
            onChange={(e) => setForm({ ...form, oxygen_level: e.target.value })}
          />

          <Input
            label="Symptoms"
            value={form.symptoms}
            onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
          />

          <Input
            label="Medicines Given"
            value={form.medicines_given}
            onChange={(e) => setForm({ ...form, medicines_given: e.target.value })}
          />

          <Textarea
            label="Notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <Select
            label="Visit Type"
            value={form.visit_type}
            onChange={(e) => setForm({ ...form, visit_type: e.target.value })}
          >
            <option value="home_visit">Home Visit</option>
            <option value="clinic">Clinic</option>
          </Select>

          <Button type="submit" loading={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Record'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default AddHealthRecord;
