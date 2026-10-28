import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FaCheck, FaExclamationTriangle, FaNotesMedical, FaUserNurse } from 'react-icons/fa';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { doctorAPI } from '../../services/api';
import useDoctorPageMeta from './useDoctorPageMeta';
import {
  formatSymptomsFromCase,
  resolveRiskScore,
  getCaseStatus,
  getEscalationSource,
  getLifecycleStatus,
  lifecycleBadgeVariant,
  isDoctorEscalated,
} from './doctorUtils';
import RiskScoreBar from './RiskScoreBar';
import { cn } from '../../utils/cn';
import MedicalDocumentsPanel from '../../components/MedicalDocumentsPanel';

function severityPanelClass(score) {
  if (score >= 70) return 'severity-panel-critical';
  if (score >= 30) return 'severity-panel-moderate';
  return 'severity-panel-low';
}

export default function DoctorEscalated() {
  const { userProfile } = useOutletContext();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [activeTab, setActiveTab] = useState('escalated');
  const [feedback, setFeedback] = useState('');
  const [resolveModal, setResolveModal] = useState({ open: false, caseId: null, notes: '' });
  const [casePanel, setCasePanel] = useState({
    open: false,
    caseItem: null,
    healthcareCaseId: null,
    loading: false,
    error: '',
    patientDetails: null,
  });
  const [casePanelFeedback, setCasePanelFeedback] = useState('');
  const [panelTab, setPanelTab] = useState('timeline');
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

  useDoctorPageMeta({
    title: 'Escalated Cases',
    subtitle: 'AI + ASHA escalation management workspace',
  });

  useEffect(() => {
    if (userProfile?.id) loadCases();
  }, [userProfile?.id]);

  const loadCases = async () => {
    try {
      const res = await doctorAPI.getFlaggedCases();
      setCases(res.data || []);
    } catch (e) {
      console.error(e);
      setCases([]);
    }
  };

  const groupByHealthcareCaseId = (items) => {
    const map = new Map();
    (items || []).forEach((it) => {
      const healthcareCaseId = it?.case_id || it?.id;
      if (!map.has(healthcareCaseId)) {
        map.set(healthcareCaseId, { healthcareCaseId, items: [] });
      }
      map.get(healthcareCaseId).items.push(it);
    });
    const groups = [...map.values()];
    groups.forEach((g) => {
      g.items.sort(
        (a, b) =>
          new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0)
      );
      g.representative = g.items[0];
    });
    groups.sort(
      (a, b) =>
        new Date(b.representative?.created_at || b.representative?.date || 0) -
        new Date(a.representative?.created_at || a.representative?.date || 0)
    );
    return groups;
  };

  const showFeedback = (message) => {
    setFeedback(message);
    setTimeout(() => setFeedback(''), 3000);
  };

  const saveNotesOnly = async () => {
    if (!resolveModal.caseId) return;
    try {
      await doctorAPI.saveCaseNotes(resolveModal.caseId, {
        doctor_notes: resolveModal.notes,
        status: 'monitoring',
      });
      setResolveModal({ open: false, caseId: null, notes: '' });
      loadCases();
      showFeedback('Doctor notes saved.');
    } catch (e) {
      console.error(e);
      showFeedback('Failed to save notes.');
    }
  };

  const resolveCase = async () => {
    if (!resolveModal.caseId) return;
    try {
      await doctorAPI.resolveFlaggedCase(resolveModal.caseId, {
        doctor_notes: resolveModal.notes || 'Reviewed and resolved by doctor',
      });
      setResolveModal({ open: false, caseId: null, notes: '' });
      loadCases();
      showFeedback('Case marked as resolved.');
    } catch (e) {
      console.error(e);
      showFeedback('Failed to resolve case.');
    }
  };

  const requestAsha = async (caseId) => {
    try {
      await doctorAPI.requestAshaFollowUp(caseId, {
        message: 'Doctor requested ASHA follow-up for escalated patient.',
      });
      showFeedback('ASHA follow-up requested.');
    } catch (e) {
      console.error(e);
      showFeedback('Failed to request ASHA follow-up.');
    }
  };

  const openCasePanel = async (item) => {
    const rep = item?.representative || item;
    const patientId = rep?.patient_id || rep?.user_id;
    if (!patientId) return;
    setPanelTab('timeline');
    setConsultationForm({
      symptoms: formatSymptomsFromCase(rep) || '',
      diagnosis: '',
      medicines: '',
      instructions: '',
      follow_up_date: '',
    });
    setPrescriptionForm({
      medicine_name: '',
      dosage: '',
      duration: '',
      instructions: '',
    });
    setCasePanel({
      open: true,
      caseItem: rep,
      healthcareCaseId: item?.healthcareCaseId || rep?.case_id || rep?.id,
      loading: true,
      error: '',
      patientDetails: null,
    });
    try {
      const res = await doctorAPI.getPatientDetails(patientId);
      setCasePanel((prev) => ({ ...prev, loading: false, patientDetails: res.data }));
    } catch (e) {
      console.error(e);
      setCasePanel((prev) => ({
        ...prev,
        loading: false,
        error: e?.response?.data?.error || 'Failed to load patient details',
      }));
    }
  };

  const closeCasePanel = () => {
    setCasePanel({ open: false, caseItem: null, healthcareCaseId: null, loading: false, error: '', patientDetails: null });
    setCasePanelFeedback('');
  };

  const saveConsultation = async () => {
    const patientId = casePanel?.caseItem?.patient_id || casePanel?.caseItem?.user_id;
    if (!patientId) return;
    try {
      await doctorAPI.addConsultation({
        patient_id: Number(patientId),
        case_id: casePanel?.healthcareCaseId,
        ...consultationForm,
      });
      const refreshed = await doctorAPI.getPatientDetails(patientId);
      setCasePanel((prev) => ({ ...prev, patientDetails: refreshed.data }));
      setCasePanelFeedback('Consultation saved to this case.');
      setPanelTab('timeline');
      setConsultationForm({
        symptoms: '',
        diagnosis: '',
        medicines: '',
        instructions: '',
        follow_up_date: '',
      });
    } catch (e) {
      console.error(e);
      setCasePanelFeedback('Failed to save consultation.');
    }
  };

  const addPrescription = async () => {
    const patientId = casePanel?.caseItem?.patient_id || casePanel?.caseItem?.user_id;
    if (!patientId) return;
    try {
      await doctorAPI.addPrescription({
        patient_id: Number(patientId),
        case_id: casePanel?.healthcareCaseId,
        ...prescriptionForm,
      });
      const refreshed = await doctorAPI.getPatientDetails(patientId);
      setCasePanel((prev) => ({ ...prev, patientDetails: refreshed.data }));
      setCasePanelFeedback('Prescription added to this case.');
      setPrescriptionForm({ medicine_name: '', dosage: '', duration: '', instructions: '' });
      setPanelTab('timeline');
    } catch (e) {
      console.error(e);
      setCasePanelFeedback('Failed to add prescription.');
    }
  };

  if (!userProfile) return <DashboardSkeleton />;

  const caseGroups = groupByHealthcareCaseId(cases);

  const activeCases = caseGroups.filter((g) => getCaseStatus(g.representative) !== 'resolved');
  const resolvedCases = caseGroups.filter((g) => getCaseStatus(g.representative) === 'resolved');
  const doctorEscalated = activeCases.filter((g) => isDoctorEscalated(g.representative));
  const aiEscalated = activeCases.filter((g) => getEscalationSource(g.representative).includes('AI'));
  const ashaEscalated = activeCases.filter((g) => getEscalationSource(g.representative).includes('ASHA'));

  const visibleCases =
    activeTab === 'all'
      ? activeCases
      : activeTab === 'ai'
      ? aiEscalated
      : activeTab === 'asha'
      ? ashaEscalated
      : activeTab === 'resolved'
      ? resolvedCases
      : doctorEscalated;

  const timelineItems = useMemo(() => {
    const d = casePanel?.patientDetails;
    if (!d) return [];
    const items = [];
    const healthcareCaseId = casePanel?.healthcareCaseId;
    (d.flaggedCases || []).forEach((fc) => {
      if (healthcareCaseId && fc?.case_id && String(fc.case_id) !== String(healthcareCaseId)) return;
      items.push({
        type: 'flag',
        at: fc.created_at || fc.date,
        title: fc.source === 'ai_triage' ? 'AI flagged case' : 'Case flagged',
        detail: fc.escalation_reason || fc.reason,
        meta: fc.status || fc.triage_status,
      });
    });
    (d.healthHistory || []).forEach((hr) => {
      if (healthcareCaseId && hr?.case_id && String(hr.case_id) !== String(healthcareCaseId)) return;
      const followUpStr = hr?.follow_up_date ? `Follow-up: ${new Date(hr.follow_up_date).toLocaleDateString()}` : '';
      items.push({
        type: 'health',
        at: hr.created_at || hr.date,
        title: hr.visit_type === 'doctor_visit' ? 'Doctor consultation' : 'Health record',
        detail: hr.symptoms || hr.notes || '—',
        meta: [hr.medicines_given || '', hr.diagnosis || '', followUpStr].filter(Boolean).join(' · '),
      });
    });
    (d.ashaVisits || []).forEach((v) => {
      if (healthcareCaseId && v?.case_id && String(v.case_id) !== String(healthcareCaseId)) return;
      items.push({
        type: 'visit',
        at: v.visit_date,
        title: 'ASHA visit',
        detail: v.symptoms_observed || v.visit_notes || '—',
        meta: v.asha_name || '',
      });
    });
    (d.prescriptions || []).forEach((p) => {
      if (healthcareCaseId && p?.case_id && String(p.case_id) !== String(healthcareCaseId)) return;
      items.push({
        type: 'rx',
        at: p.created_at || p.date,
        title: 'Prescription added',
        detail: `${p.medicine_name} · ${p.dosage || '—'}${p.duration ? ` · ${p.duration}` : ''}`,
        meta: p.doctor_name || '',
      });
    });
    items.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
    return items.slice(0, 60);
  }, [casePanel?.patientDetails, casePanel?.healthcareCaseId]);

  return (
    <div className="page-container dashboard-stack">
      {feedback && (
        <div className="rounded-xl border border-brand-500/25 bg-brand-500/10 px-4 py-3 text-sm text-brand-800 dark:text-brand-200">
          {feedback}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaExclamationTriangle className="text-red-500" />
            Escalated Cases Workspace
          </CardTitle>
          <Badge variant="danger">{doctorEscalated.length} urgent</Badge>
        </CardHeader>
        <p className="mb-4 text-sm text-muted-fg">
          Manage AI and ASHA escalations end-to-end: review patient, add notes, request ASHA follow-up, resolve.
        </p>

        <div className="mb-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setActiveTab('escalated')} className={activeTab === 'escalated' ? 'filter-chip-active' : 'filter-chip'}>Escalated ({doctorEscalated.length})</button>
          <button type="button" onClick={() => setActiveTab('ai')} className={activeTab === 'ai' ? 'filter-chip-active' : 'filter-chip'}>AI Escalated ({aiEscalated.length})</button>
          <button type="button" onClick={() => setActiveTab('asha')} className={activeTab === 'asha' ? 'filter-chip-active' : 'filter-chip'}>ASHA Escalated ({ashaEscalated.length})</button>
          <button type="button" onClick={() => setActiveTab('all')} className={activeTab === 'all' ? 'filter-chip-active' : 'filter-chip'}>All Active ({activeCases.length})</button>
          <button type="button" onClick={() => setActiveTab('resolved')} className={activeTab === 'resolved' ? 'filter-chip-active' : 'filter-chip'}>Resolved ({resolvedCases.length})</button>
        </div>

        {visibleCases.length === 0 ? (
          <EmptyState
            icon={FaExclamationTriangle}
            title="No cases in this queue"
            description="Cases will appear here as AI triage and ASHA escalations come in."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleCases.map((group) => {
              const rep = group?.representative || group;
              const score = resolveRiskScore(rep);
              const status = getCaseStatus(rep);
              const source = getEscalationSource(rep);
              return (
                <div key={group?.healthcareCaseId || rep?.case_id || rep?.id} className={cn(severityPanelClass(score), 'flex flex-col gap-3')}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-fg">{rep.patient_name}</h4>
                      <p className="text-xs text-muted-fg">
                        {rep.village_name || 'Unknown village'} · Age {rep.patient_age || '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="danger" className="tabular-nums">
                        {score}/100
                      </Badge>
                      <p className="mt-1 text-[10px] text-muted-fg">
                        {new Date(rep.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <RiskScoreBar score={score} showLabel={false} />

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-fg">Symptoms summary</p>
                    <p className="mt-1 text-sm text-fg-secondary">{formatSymptomsFromCase(rep)}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-fg">
                      Escalation reason
                    </p>
                    <p className="mt-1 text-sm text-fg-secondary line-clamp-3">
                      {rep.escalation_reason || rep.reason}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={score >= 70 ? 'danger' : 'warning'}>{score}/100 risk</Badge>
                    <Badge variant={source.includes('AI') ? 'info' : source.includes('ASHA') ? 'primary' : 'default'}>{source}</Badge>
                    <Badge variant={lifecycleBadgeVariant(getLifecycleStatus(rep))}>
                      {getLifecycleStatus(rep).replaceAll('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-default pt-3">
                    <Button
                      size="sm"
                      onClick={() => openCasePanel(group)}
                    >
                      {status === 'resolved' ? 'Open case' : 'Manage case'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/patient/${rep.patient_id || rep.user_id}`)}>
                      Open patient
                    </Button>
                    {status !== 'resolved' && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setResolveModal({ open: true, caseId: rep.id, notes: rep.doctor_notes || '' })
                          }
                        >
                          <FaNotesMedical className="mr-1" /> Notes
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => requestAsha(rep.id)}>
                          <FaUserNurse className="mr-1" /> Follow-up
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setResolveModal({
                              open: true,
                              caseId: rep.id,
                              notes: 'Reviewed — case resolved',
                            })
                          }
                        >
                          <FaCheck className="mr-1" /> Resolve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {resolveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md !bg-card !shadow-xl">
            <CardTitle>Resolve case / add notes</CardTitle>
            <textarea
              className="input-field mt-3 w-full"
              rows={4}
              placeholder="Doctor notes..."
              value={resolveModal.notes}
              onChange={(e) => setResolveModal((m) => ({ ...m, notes: e.target.value }))}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={saveNotesOnly}>Save notes</Button>
              <Button onClick={resolveCase}>Save & Resolve</Button>
              <Button
                variant="ghost"
                onClick={() => setResolveModal({ open: false, caseId: null, notes: '' })}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {casePanel.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-3xl !bg-card !shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>Escalated case management</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  {casePanel.caseItem?.patient_name || 'Patient'} · ID {casePanel.caseItem?.patient_id || casePanel.caseItem?.user_id}
                  {casePanel.caseItem?.village_name ? ` · ${casePanel.caseItem?.village_name}` : ''}
                  {casePanel.healthcareCaseId ? ` · Case #${casePanel.healthcareCaseId}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={closeCasePanel}>Close</Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { id: 'timeline', label: 'Timeline' },
                { id: 'consult', label: 'Consultation notes' },
                { id: 'rx', label: 'Prescription' },
                { id: 'reports', label: 'Reports' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPanelTab(t.id)}
                  className={panelTab === t.id ? 'filter-chip-active' : 'filter-chip'}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {casePanelFeedback ? (
              <div className="mt-3 rounded-xl border border-brand-500/25 bg-brand-500/10 px-4 py-2 text-sm text-brand-800 dark:text-brand-200">
                {casePanelFeedback}
              </div>
            ) : null}

            {casePanel.loading ? (
              <p className="mt-6 text-sm text-muted-fg">Loading patient history…</p>
            ) : casePanel.error ? (
              <p className="mt-6 text-sm text-red-400">{casePanel.error}</p>
            ) : (
              <>
                {panelTab === 'timeline' && (
                  <div className="mt-5 space-y-3 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
                    {timelineItems.length === 0 ? (
                      <EmptyState
                        icon={FaNotesMedical}
                        title="No history yet"
                        description="Consultations, prescriptions, ASHA visits, and flags will appear here."
                      />
                    ) : (
                      timelineItems.map((t, idx) => (
                        <div key={`${t.type}-${idx}`} className="rounded-xl border border-default bg-card-secondary p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-fg">{t.title}</p>
                              <p className="mt-1 text-sm text-fg-secondary">{t.detail}</p>
                              {t.meta ? (
                                <p className="mt-2 text-xs text-muted-fg">{t.meta}</p>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-fg">
                              {t.at ? new Date(t.at).toLocaleString() : '—'}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {panelTab === 'consult' && (
                  <div className="mt-5 space-y-3">
                    <input
                      className="input-field"
                      placeholder="Symptoms"
                      value={consultationForm.symptoms}
                      onChange={(e) => setConsultationForm((v) => ({ ...v, symptoms: e.target.value }))}
                    />
                    <input
                      className="input-field"
                      placeholder="Diagnosis / clinical notes"
                      value={consultationForm.diagnosis}
                      onChange={(e) => setConsultationForm((v) => ({ ...v, diagnosis: e.target.value }))}
                    />
                    <input
                      className="input-field"
                      placeholder="Medicines / treatment guidance"
                      value={consultationForm.medicines}
                      onChange={(e) => setConsultationForm((v) => ({ ...v, medicines: e.target.value }))}
                    />
                    <textarea
                      className="input-field"
                      rows={3}
                      placeholder="Instructions / follow-up advice"
                      value={consultationForm.instructions}
                      onChange={(e) => setConsultationForm((v) => ({ ...v, instructions: e.target.value }))}
                    />
                    <input
                      type="date"
                      className="input-field max-w-[220px]"
                      value={consultationForm.follow_up_date}
                      onChange={(e) => setConsultationForm((v) => ({ ...v, follow_up_date: e.target.value }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={saveConsultation}>Save consultation</Button>
                      <Button variant="ghost" onClick={() => setPanelTab('timeline')}>Cancel</Button>
                    </div>
                  </div>
                )}

                {panelTab === 'rx' && (
                  <div className="mt-5 space-y-3">
                    <input
                      className="input-field"
                      placeholder="Medicine name"
                      value={prescriptionForm.medicine_name}
                      onChange={(e) => setPrescriptionForm((v) => ({ ...v, medicine_name: e.target.value }))}
                    />
                    <input
                      className="input-field"
                      placeholder="Dosage"
                      value={prescriptionForm.dosage}
                      onChange={(e) => setPrescriptionForm((v) => ({ ...v, dosage: e.target.value }))}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="input-field"
                        placeholder="Frequency / timing (e.g. 1-0-1 after food)"
                        value={prescriptionForm.instructions}
                        onChange={(e) => setPrescriptionForm((v) => ({ ...v, instructions: e.target.value }))}
                      />
                      <input
                        className="input-field"
                        placeholder="Duration (e.g. 5 days)"
                        value={prescriptionForm.duration}
                        onChange={(e) => setPrescriptionForm((v) => ({ ...v, duration: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={addPrescription}>Add prescription</Button>
                      <Button variant="ghost" onClick={() => setPanelTab('timeline')}>Cancel</Button>
                    </div>
                    {(casePanel.patientDetails?.prescriptions || []).filter((p) => {
                      if (!casePanel.healthcareCaseId) return true;
                      return String(p?.case_id || '') === String(casePanel.healthcareCaseId);
                    }).length ? (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-fg">Recent prescriptions</p>
                        <div className="max-h-56 overflow-y-auto scrollbar-thin space-y-2">
                          {(casePanel.patientDetails?.prescriptions || [])
                            .filter((p) => {
                              if (!casePanel.healthcareCaseId) return true;
                              return String(p?.case_id || '') === String(casePanel.healthcareCaseId);
                            })
                            .slice(0, 10)
                            .map((rx) => (
                            <div key={rx.id} className="rounded-xl border border-default bg-card-secondary p-3">
                              <p className="text-sm font-medium text-fg">{rx.medicine_name}</p>
                              <p className="text-xs text-muted-fg">
                                {rx.dosage || '—'}{rx.duration ? ` · ${rx.duration}` : ''}{rx.instructions ? ` · ${rx.instructions}` : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {panelTab === 'reports' && (
                  <div className="mt-5">
                    <MedicalDocumentsPanel
                      patientId={casePanel.caseItem?.patient_id || casePanel.caseItem?.user_id}
                      caseId={casePanel.healthcareCaseId}
                      title="Reports & medical attachments"
                    />
                  </div>
                )}
              </>
            )}

            <div className="mt-5 flex flex-wrap gap-2 border-t border-default pt-4">
              <Button size="sm" variant="secondary" onClick={() => setResolveModal({ open: true, caseId: casePanel.caseItem?.id, notes: casePanel.caseItem?.doctor_notes || '' })}>
                <FaNotesMedical className="mr-1" /> Case notes
              </Button>
              <Button size="sm" variant="ghost" onClick={() => requestAsha(casePanel.caseItem?.id)}>
                <FaUserNurse className="mr-1" /> Request ASHA follow-up
              </Button>
              {getCaseStatus(casePanel.caseItem) !== 'resolved' ? (
                <Button size="sm" variant="ghost" onClick={() => setResolveModal({ open: true, caseId: casePanel.caseItem?.id, notes: 'Reviewed — case resolved' })}>
                  <FaCheck className="mr-1" /> Resolve
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => navigate(`/patient/${casePanel.caseItem?.patient_id || casePanel.caseItem?.user_id}`)}>
                Open patient full page
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
