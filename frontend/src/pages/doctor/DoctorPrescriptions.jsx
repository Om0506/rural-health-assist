import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import jsPDF from 'jspdf';
import { FaFilePrescription } from 'react-icons/fa';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { doctorAPI } from '../../services/api';
import useDoctorPageMeta from './useDoctorPageMeta';
import FeedbackBanner from '../../components/ui/FeedbackBanner';
import { getApiErrorMessage } from '../../utils/apiError';

function safeText(value) {
  return String(value || '').trim();
}

function splitLines(text, max = 80) {
  const raw = safeText(text);
  if (!raw) return ['—'];
  const words = raw.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : ['—'];
}

function parseFrequency(rx) {
  const text = safeText(rx?.instructions);
  if (!text) return '—';
  return text;
}

export default function DoctorPrescriptions() {
  const { userProfile } = useOutletContext();
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [details, setDetails] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [feedback, setFeedback] = useState({ message: '', variant: 'info' });
  const [consultationForm, setConsultationForm] = useState({
    symptoms: '',
    diagnosis: '',
    medicines: '',
    instructions: '',
    follow_up_date: '',
  });
  const [prescriptionForm, setPrescriptionForm] = useState({
    medicine_name: '',
    dosage: '',
    duration: '',
    instructions: '',
  });

  useDoctorPageMeta({ title: 'Prescriptions', subtitle: 'Consultations and medicine guidance' });

  useEffect(() => {
    if (userProfile?.id) {
      doctorAPI.searchPatients({}).then((r) => setPatients(r.data || [])).catch(() => setPatients([]));
    }
  }, [userProfile?.id]);

  useEffect(() => {
    if (!selectedId) {
      setDetails(null);
      setPrescriptions([]);
      return;
    }
    Promise.all([
      doctorAPI.getPatientDetails(selectedId),
      doctorAPI.getPrescriptions(selectedId),
    ])
      .then(([d, p]) => {
        setDetails(d.data);
        setPrescriptions(p.data || []);
      })
      .catch((e) => {
        console.error(e);
        setFeedback({ message: getApiErrorMessage(e, 'Failed to load patient details.'), variant: 'error' });
      });
  }, [selectedId]);

  const submitConsultation = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setFeedback({ message: '', variant: 'info' });
    try {
      await doctorAPI.addConsultation({ patient_id: Number(selectedId), ...consultationForm });
      setConsultationForm({
        symptoms: '',
        diagnosis: '',
        medicines: '',
        instructions: '',
        follow_up_date: '',
      });
      const d = await doctorAPI.getPatientDetails(selectedId);
      setDetails(d.data);
      setFeedback({ message: 'Consultation saved.', variant: 'success' });
    } catch (e2) {
      console.error(e2);
      setFeedback({ message: getApiErrorMessage(e2, 'Failed to save consultation.'), variant: 'error' });
    }
  };

  const submitPrescription = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setFeedback({ message: '', variant: 'info' });
    try {
      await doctorAPI.addPrescription({ patient_id: Number(selectedId), ...prescriptionForm });
      setPrescriptionForm({ medicine_name: '', dosage: '', duration: '', instructions: '' });
      const p = await doctorAPI.getPrescriptions(selectedId);
      setPrescriptions(p.data || []);
      setFeedback({ message: 'Prescription added.', variant: 'success' });
    } catch (e2) {
      console.error(e2);
      setFeedback({ message: getApiErrorMessage(e2, 'Failed to add prescription.'), variant: 'error' });
    }
  };

  const downloadPdf = (rx) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const p = details?.patient || {};
    const doctorName = safeText(rx?.doctor_name) || safeText(userProfile?.name) || 'Doctor';
    const specialization = 'General Medicine';
    const dateLabel = new Date(rx?.created_at || rx?.date || Date.now()).toLocaleDateString();

    const left = 14;
    let y = 16;

    pdf.setFontSize(16);
    pdf.text('Rural Health Assistance System', left, y);
    y += 6;
    pdf.setFontSize(11);
    pdf.text(`Dr. ${doctorName} · ${specialization}`, left, y);
    pdf.text(`Consultation date: ${dateLabel}`, 140, y, { align: 'right' });
    y += 8;

    pdf.setDrawColor(200);
    pdf.line(left, y, 200 - left, y);
    y += 6;

    pdf.setFontSize(12);
    pdf.text('Patient details', left, y);
    y += 5;
    pdf.setFontSize(10.5);
    const patientName = safeText(p.name) || 'Patient';
    const village = safeText(p.village_name) || safeText(p.villageName) || '—';
    pdf.text(`Name: ${patientName}`, left, y);
    pdf.text(`Patient ID: ${p.id || selectedId}`, 140, y, { align: 'right' });
    y += 5;
    pdf.text(`Age: ${p.age ?? '—'}   Gender: ${p.gender ?? '—'}`, left, y);
    pdf.text(`Village: ${village}`, 140, y, { align: 'right' });
    y += 8;

    pdf.setFontSize(12);
    pdf.text('Consultation details', left, y);
    y += 5;
    pdf.setFontSize(10.5);
    const recentConsult = (details?.healthHistory || []).find((h) => h.visit_type === 'doctor_visit') || null;
    const symptoms = safeText(recentConsult?.symptoms) || '—';
    const summary = safeText(recentConsult?.notes) || safeText(recentConsult?.diagnosis) || '—';
    const symptomsLines = splitLines(symptoms, 95);
    const summaryLines = splitLines(summary, 95);
    pdf.text('Symptoms:', left, y);
    y += 5;
    symptomsLines.forEach((l) => {
      pdf.text(l, left + 16, y);
      y += 4.5;
    });
    pdf.text('Summary:', left, y);
    y += 5;
    summaryLines.forEach((l) => {
      pdf.text(l, left + 16, y);
      y += 4.5;
    });
    y += 2;

    pdf.setFontSize(12);
    pdf.text('Medicines', left, y);
    y += 6;

    const tableLeft = left;
    const col = [tableLeft, tableLeft + 62, tableLeft + 98, tableLeft + 132, tableLeft + 168];
    pdf.setFontSize(10);
    pdf.setFillColor(245, 245, 245);
    pdf.rect(tableLeft, y - 4.5, 200 - tableLeft * 2, 7, 'F');
    pdf.text('Medicine', col[0] + 1, y);
    pdf.text('Dosage', col[1] + 1, y);
    pdf.text('Frequency', col[2] + 1, y);
    pdf.text('Duration', col[3] + 1, y);
    pdf.text('When', col[4] + 1, y);
    y += 6;

    const whenToTake = safeText(rx?.instructions)?.toLowerCase().includes('after')
      ? 'After food'
      : safeText(rx?.instructions)?.toLowerCase().includes('before')
      ? 'Before food'
      : 'As directed';

    pdf.text(safeText(rx?.medicine_name) || '—', col[0] + 1, y);
    pdf.text(safeText(rx?.dosage) || '—', col[1] + 1, y);
    pdf.text(parseFrequency(rx), col[2] + 1, y);
    pdf.text(safeText(rx?.duration) || '—', col[3] + 1, y);
    pdf.text(whenToTake, col[4] + 1, y);
    y += 10;

    pdf.setFontSize(11);
    pdf.text('Additional notes', left, y);
    y += 6;
    pdf.setFontSize(10.5);
    const precautions = safeText(rx?.doctor_notes) || safeText(rx?.instructions) || 'Take medicines as prescribed. Maintain hydration and rest.';
    splitLines(precautions, 95).forEach((l) => {
      pdf.text(l, left, y);
      y += 4.5;
    });

    pdf.setDrawColor(220);
    pdf.line(left, 270, 200 - left, 270);
    pdf.setFontSize(10);
    pdf.text('Doctor signature: ____________________', left, 278);
    pdf.setFontSize(8.5);
    pdf.text('Disclaimer: This prescription is for guidance only. Seek emergency care for worsening symptoms.', left, 286);

    pdf.save(`prescription_${patientName.replace(/\s+/g, '_')}_${rx.id}.pdf`);
  };

  if (!userProfile) return <DashboardSkeleton />;

  return (
    <div className="page-container dashboard-stack">
      <FeedbackBanner message={feedback.message} variant={feedback.variant} />
      <Card className="mb-4">
        <label className="mb-2 block text-sm font-medium text-fg">Select patient</label>
        <select
          className="input-field max-w-md"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">Choose patient...</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.village_name || 'No village'}
            </option>
          ))}
        </select>
      </Card>

      {!selectedId ? (
        <EmptyState
          icon={FaFilePrescription}
          title="Select a patient"
          description="Choose a patient above to add consultations or prescriptions."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Add consultation</CardTitle>
            </CardHeader>
            <form onSubmit={submitConsultation} className="space-y-3">
              <input
                className="input-field"
                placeholder="Symptoms"
                value={consultationForm.symptoms}
                onChange={(e) => setConsultationForm((v) => ({ ...v, symptoms: e.target.value }))}
                required
              />
              <input
                className="input-field"
                placeholder="Clinical notes"
                value={consultationForm.diagnosis}
                onChange={(e) => setConsultationForm((v) => ({ ...v, diagnosis: e.target.value }))}
                required
              />
              <input
                className="input-field"
                placeholder="Medicines / guidance"
                value={consultationForm.medicines}
                onChange={(e) => setConsultationForm((v) => ({ ...v, medicines: e.target.value }))}
                required
              />
              <textarea
                className="input-field"
                rows={2}
                placeholder="Follow-up advice"
                value={consultationForm.instructions}
                onChange={(e) => setConsultationForm((v) => ({ ...v, instructions: e.target.value }))}
              />
              <input
                type="date"
                className="input-field"
                value={consultationForm.follow_up_date}
                onChange={(e) =>
                  setConsultationForm((v) => ({ ...v, follow_up_date: e.target.value }))
                }
              />
              <Button type="submit">Save consultation</Button>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prescriptions</CardTitle>
            </CardHeader>
            <form onSubmit={submitPrescription} className="mb-4 space-y-3">
              <input
                className="input-field"
                placeholder="Medicine name"
                value={prescriptionForm.medicine_name}
                onChange={(e) =>
                  setPrescriptionForm((v) => ({ ...v, medicine_name: e.target.value }))
                }
                required
              />
              <input
                className="input-field"
                placeholder="Dosage"
                value={prescriptionForm.dosage}
                onChange={(e) => setPrescriptionForm((v) => ({ ...v, dosage: e.target.value }))}
                required
              />
              <input
                className="input-field"
                placeholder="Duration"
                value={prescriptionForm.duration}
                onChange={(e) => setPrescriptionForm((v) => ({ ...v, duration: e.target.value }))}
              />
              <textarea
                className="input-field"
                rows={2}
                placeholder="Instructions"
                value={prescriptionForm.instructions}
                onChange={(e) =>
                  setPrescriptionForm((v) => ({ ...v, instructions: e.target.value }))
                }
              />
              <Button type="submit">Add prescription</Button>
            </form>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="rounded-xl border border-default bg-card-secondary p-3">
                  <p className="font-medium text-fg">{rx.medicine_name}</p>
                  <p className="text-xs text-muted-fg">
                    {rx.dosage} · {rx.duration || '—'}
                  </p>
                  <Button size="sm" className="mt-2" onClick={() => downloadPdf(rx)}>
                    Download PDF
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
