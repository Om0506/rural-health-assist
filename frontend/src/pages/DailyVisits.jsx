import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { visitsAPI } from '../services/api';
import PatientIdentifier from '../components/PatientIdentifier';

function DailyVisits({ userProfile }) {
  const [searchParams] = useSearchParams();
  const prefilledPatientId = searchParams.get('patientId') || '';
  const [form, setForm] = useState({
    patient_id: prefilledPatientId,
    visit_notes: '',
    symptoms_observed: '',
    follow_up_required: false
  });
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    if (prefilledPatientId) {
      setForm((prev) => ({ ...prev, patient_id: prefilledPatientId }));
    }
  }, [prefilledPatientId]);

  const loadVisits = async () => {
    if (!userProfile?.id) return;
    const res = await visitsAPI.getByAsha(userProfile.id);
    setVisits(res.data || []);
  };

  useEffect(() => {
    loadVisits().catch(() => setVisits([]));
  }, [userProfile?.id]);

  const submit = async (e) => {
    e.preventDefault();
    await visitsAPI.add({
      patient_id: Number(form.patient_id),
      visit_notes: form.visit_notes,
      symptoms_observed: form.symptoms_observed,
      follow_up_required: form.follow_up_required
    });
    setForm({
      patient_id: prefilledPatientId,
      visit_notes: '',
      symptoms_observed: '',
      follow_up_required: false
    });
    loadVisits().catch(() => {});
  };

  return (
    <div className="page-container max-w-5xl space-y-5">
        <div className="card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Daily Visits</h1>
            <Link to="/dashboard/asha" className="text-sm text-indigo-700 hover:text-indigo-900 font-medium">
              Back to ASHA dashboard
            </Link>
          </div>
          {prefilledPatientId && (
            <p className="mb-3 text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-3 py-2">
              Patient selected from QR: <span className="font-semibold">ID {prefilledPatientId}</span>
            </p>
          )}
          <form onSubmit={submit} className="grid md:grid-cols-2 gap-3">
            {!prefilledPatientId ? (
              <div className="md:col-span-2">
                <PatientIdentifier
                  initialPatientId={form.patient_id}
                  onResolved={({ id }) => setForm((prev) => ({ ...prev, patient_id: String(id) }))}
                />
              </div>
            ) : (
              <div className="md:col-span-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
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
            <input className="input-field" placeholder="Symptoms Observed" value={form.symptoms_observed} onChange={(e) => setForm({ ...form, symptoms_observed: e.target.value })} />
            <textarea className="input-field md:col-span-2" rows={3} placeholder="Visit Notes" value={form.visit_notes} onChange={(e) => setForm({ ...form, visit_notes: e.target.value })} />
            <label className="text-sm text-gray-700 flex items-center gap-2">
              <input type="checkbox" checked={form.follow_up_required} onChange={(e) => setForm({ ...form, follow_up_required: e.target.checked })} />
              Follow up required
            </label>
            <button className="btn-primary md:col-span-2" type="submit">Add Visit</button>
          </form>
        </div>

        <div className="card border border-gray-100">
          <h2 className="text-lg font-semibold mb-3">Recent Visits</h2>
          {visits.length === 0 ? <p className="text-gray-500">No visits recorded yet.</p> : (
            <div className="space-y-2">
              {visits.map((visit) => (
                <div key={visit.id} className="rounded-xl border border-default bg-card-secondary p-3.5">
                  <p className="font-medium">Patient ID: {visit.patient_id}</p>
                  <p className="text-sm text-gray-600">{visit.symptoms_observed || '-'}</p>
                  <p className="text-xs text-gray-500">{new Date(visit.visit_date).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}

export default DailyVisits;
