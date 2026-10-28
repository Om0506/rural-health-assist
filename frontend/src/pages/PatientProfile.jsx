import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doctorAPI, flagAPI, healthAPI, historyAPI, medicineAPI, userAPI, villagerProfileAPI } from '../services/api';
import FlagCaseModal from '../components/FlagCaseModal';
import CaseTimelineModal from '../components/CaseTimelineModal';
import {
  FaFlag,
  FaHeartbeat,
  FaNotesMedical,
  FaPhone,
  FaUser,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaClipboardList,
  FaPills,
} from 'react-icons/fa';
import { useTopbar } from '../context/TopbarContext';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge, { SeverityBadge } from '../components/ui/Badge';
import Tabs from '../components/ui/Tabs';
import EmptyState from '../components/ui/EmptyState';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { cn } from '../utils/cn';
import MedicalDocumentsPanel from '../components/MedicalDocumentsPanel';
import VillagerHealthRecords from '../components/villager/VillagerHealthRecords';
import { useLanguage } from '../context/LanguageContext';
import { translateStatus } from '../utils/i18nHealthcare';

function severityPanelClass(severity) {
  const s = String(severity || '').toLowerCase();
  if (s === 'critical') return 'severity-panel-critical';
  if (s === 'high') return 'severity-panel-high';
  if (s === 'moderate') return 'severity-panel-moderate';
  return 'severity-panel-low';
}

function PatientProfile() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { setTopbarMeta, resetTopbarMeta } = useTopbar();
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [healthcareCases, setHealthcareCases] = useState([]);
  const [caseTimeline, setCaseTimeline] = useState([]);
  const [flaggedCases, setFlaggedCases] = useState([]);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [medicineLogs, setMedicineLogs] = useState([]);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [timelineModal, setTimelineModal] = useState({ open: false, loading: false, error: '', items: [] });
  const [editRecordModal, setEditRecordModal] = useState({ open: false, record: null, saving: false, error: '' });
  const [deleteRecordModal, setDeleteRecordModal] = useState({ open: false, recordId: null, busy: false, error: '' });
  const [editMedicineModal, setEditMedicineModal] = useState({ open: false, log: null, saving: false, error: '' });
  const [deleteMedicineModal, setDeleteMedicineModal] = useState({ open: false, logId: null, busy: false, error: '' });
  const [feedback, setFeedback] = useState('');
  const [uploadPanel, setUploadPanel] = useState({ open: false, caseId: null });
  const [caseNotesModal, setCaseNotesModal] = useState({ open: false, flagId: null, notes: '', mode: 'notes' });

  const showFeedback = (message) => {
    setFeedback(message);
    setTimeout(() => setFeedback(''), 3000);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [viewerRes, userRes, profileRes, recordsRes, allFlagsRes, medLogsRes, bundleRes] = await Promise.allSettled([
          userAPI.getProfile(),
          userAPI.getUser(patientId),
          villagerProfileAPI.getByUser(patientId),
          healthAPI.getRecords(patientId),
          flagAPI.getAllFlagged(),
          medicineAPI.getPatientLogs(patientId),
          historyAPI.getPatientBundle(patientId),
        ]);
        if (viewerRes.status === 'fulfilled') setCurrentUserProfile(viewerRes.value.data);
        if (userRes.status === 'fulfilled') setUser(userRes.value.data);
        if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
        else setProfile(null);
        const bundle = bundleRes.status === 'fulfilled' ? bundleRes.value.data || {} : {};
        setRecords(bundle.healthHistory || (recordsRes.status === 'fulfilled' ? recordsRes.value.data || [] : []));
        setDocuments(bundle.documents || []);
        setPrescriptions(bundle.prescriptions || []);
        setHealthcareCases(bundle.healthcareCases || []);
        setCaseTimeline(bundle.caseTimeline || []);
        setMedicineLogs(medLogsRes.status === 'fulfilled' ? medLogsRes.value.data || [] : []);
        setFlaggedCases(
          (bundle.flaggedCases || (allFlagsRes.status === 'fulfilled' ? allFlagsRes.value.data || [] : [])).filter(
            (f) =>
              String(f.patient_id || f.user_id) === String(patientId) ||
              String(f.user_id) === String(patientId)
          )
        );
      } catch (error) {
        console.error('Failed to load patient profile', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patientId]);

  const refreshPatientWorkflow = async () => {
    try {
      const [bundleRes, flagsRes, medLogsRes] = await Promise.allSettled([
        historyAPI.getPatientBundle(patientId),
        flagAPI.getAllFlagged(),
        medicineAPI.getPatientLogs(patientId),
      ]);
      if (bundleRes.status === 'fulfilled') {
        const bundle = bundleRes.value.data || {};
        setRecords(bundle.healthHistory || []);
        setDocuments(bundle.documents || []);
        setPrescriptions(bundle.prescriptions || []);
        setHealthcareCases(bundle.healthcareCases || []);
        setCaseTimeline(bundle.caseTimeline || []);
        setFlaggedCases(bundle.flaggedCases || []);
      } else if (flagsRes.status === 'fulfilled') {
        setFlaggedCases((flagsRes.value.data || []).filter((f) => String(f.patient_id || f.user_id) === String(patientId)));
      }
      if (medLogsRes.status === 'fulfilled') setMedicineLogs(medLogsRes.value.data || []);
    } catch (error) {
      console.error('Failed to refresh patient workflow', error);
    }
  };

  const openTimeline = async () => {
    setTimelineModal({ open: true, loading: true, error: '', items: [] });
    try {
      const res = await historyAPI.getPatientBundle(patientId);
      const d = res.data;
      const items = [];

      (d.flaggedCases || []).forEach((fc) => {
        items.push({
          type: 'flag',
          at: fc.created_at || fc.date,
          title: fc.source === 'ai_triage' ? 'AI flagged case' : 'Case flagged',
          detail: fc.escalation_reason || fc.reason,
          badge: fc.status || fc.triage_status || 'flag',
          badgeVariant: fc.status === 'resolved' ? 'success' : 'warning',
        });
      });

      (d.healthHistory || []).forEach((hr) => {
        items.push({
          type: 'health',
          at: hr.created_at || hr.date,
          title: hr.visit_type === 'doctor_visit' ? 'Doctor consultation' : 'Health record',
          detail: hr.symptoms || hr.notes || '—',
          badge: hr.visit_type || 'record',
          badgeVariant: 'info',
        });
      });

      (d.ashaVisits || []).forEach((v) => {
        items.push({
          type: 'visit',
          at: v.visit_date,
          title: 'ASHA visit',
          detail: v.symptoms_observed || v.visit_notes || '—',
          badge: v.follow_up_required ? t('Follow-up') : t('Visit'),
          badgeVariant: v.follow_up_required ? 'warning' : 'default',
        });
      });

      (d.prescriptions || []).forEach((p) => {
        items.push({
          type: 'rx',
          at: p.created_at || p.date,
          title: 'Prescription added',
          detail: `${p.medicine_name} · ${p.dosage || '—'}${p.duration ? ` · ${p.duration}` : ''}`,
          badge: 'Prescription',
          badgeVariant: 'primary',
        });
      });

      (d.medicineLogs || []).forEach((ml) => {
        items.push({
          type: 'medlog',
          at: ml.distributed_date,
          title: 'Medicine distributed',
          detail: `${ml.medicine_name} · Qty ${ml.quantity}`,
          meta: ml.notes || '',
          badge: 'Medicine log',
          badgeVariant: 'default',
        });
      });

      (d.documents || []).forEach((doc) => {
        items.push({
          type: 'doc',
          at: doc.created_at,
          title: 'Report uploaded',
          detail: doc.title || doc.original_name || 'Medical document',
          meta: `${String(doc.category || 'general').replaceAll('_', ' ')} · ${t('Uploaded by')} ${doc.uploaded_by_name || '—'}`,
          badge: 'Document',
          badgeVariant: 'primary',
        });
      });

      items.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
      setTimelineModal({ open: true, loading: false, error: '', items });
    } catch (error) {
      console.error('Failed to load timeline', error);
      showFeedback('Failed to load timeline.');
      setTimelineModal({
        open: true,
        loading: false,
        error: error?.response?.data?.error || 'Failed to load timeline',
        items: [],
      });
    }
  };

  const openEditRecord = (record) => {
    setEditRecordModal({
      open: true,
      saving: false,
      error: '',
      record: {
        ...record,
        temperature: record?.temperature ?? record?.vitals?.temperature ?? '',
        blood_pressure: record?.blood_pressure ?? record?.vitals?.blood_pressure ?? '',
        pulse: record?.vitals?.pulse ?? '',
        weight: record?.vitals?.weight ?? '',
        oxygen_level: record?.vitals?.oxygen_level ?? '',
      },
    });
  };

  const saveEditedRecord = async () => {
    const r = editRecordModal.record;
    if (!r?.id) return;
    setEditRecordModal((m) => ({ ...m, saving: true, error: '' }));
    try {
      await healthAPI.updateRecord(r.id, {
        notes: r.notes ?? '',
        symptoms: r.symptoms ?? '',
        medicines_given: r.medicines_given ?? '',
        visit_type: r.visit_type ?? '',
        temperature: r.temperature ?? '',
        blood_pressure: r.blood_pressure ?? '',
        pulse: r.pulse ?? '',
        weight: r.weight ?? '',
        oxygen_level: r.oxygen_level ?? '',
        vitals: {
          temperature: r.temperature || undefined,
          blood_pressure: r.blood_pressure || undefined,
          pulse: r.pulse || undefined,
          weight: r.weight || undefined,
          oxygen_level: r.oxygen_level || undefined,
        },
      });
      const refreshed = await healthAPI.getRecords(patientId);
      setRecords(refreshed.data || []);
      setEditRecordModal({ open: false, record: null, saving: false, error: '' });
      showFeedback('Health record updated.');
    } catch (e) {
      console.error(e);
      setEditRecordModal((m) => ({ ...m, saving: false, error: e?.response?.data?.error || 'Update failed' }));
      showFeedback('Failed to update health record.');
    }
  };

  const confirmDeleteRecord = (recordId) => {
    setDeleteRecordModal({ open: true, recordId, busy: false, error: '' });
  };

  const deleteRecord = async () => {
    if (!deleteRecordModal.recordId) return;
    setDeleteRecordModal((m) => ({ ...m, busy: true, error: '' }));
    try {
      await healthAPI.deleteRecord(deleteRecordModal.recordId);
      const refreshed = await healthAPI.getRecords(patientId);
      setRecords(refreshed.data || []);
      setDeleteRecordModal({ open: false, recordId: null, busy: false, error: '' });
      showFeedback('Health record deleted.');
    } catch (e) {
      console.error(e);
      setDeleteRecordModal((m) => ({ ...m, busy: false, error: e?.response?.data?.error || 'Delete failed' }));
      showFeedback('Failed to delete health record.');
    }
  };

  const openEditMedicineLog = (log) => {
    setEditMedicineModal({ open: true, log: { ...log }, saving: false, error: '' });
  };

  const saveEditedMedicineLog = async () => {
    const l = editMedicineModal.log;
    if (!l?.id) return;
    setEditMedicineModal((m) => ({ ...m, saving: true, error: '' }));
    try {
      await medicineAPI.updateLog(l.id, {
        medicine_name: l.medicine_name ?? '',
        quantity: Number(l.quantity || 1),
        notes: l.notes ?? '',
      });
      const refreshed = await medicineAPI.getPatientLogs(patientId);
      setMedicineLogs(refreshed.data || []);
      setEditMedicineModal({ open: false, log: null, saving: false, error: '' });
      showFeedback('Medicine log updated.');
    } catch (e) {
      console.error(e);
      setEditMedicineModal((m) => ({ ...m, saving: false, error: e?.response?.data?.error || 'Update failed' }));
      showFeedback('Failed to update medicine log.');
    }
  };

  const confirmDeleteMedicineLog = (logId) => {
    setDeleteMedicineModal({ open: true, logId, busy: false, error: '' });
  };

  const deleteMedicineLog = async () => {
    if (!deleteMedicineModal.logId) return;
    setDeleteMedicineModal((m) => ({ ...m, busy: true, error: '' }));
    try {
      await medicineAPI.deleteLog(deleteMedicineModal.logId);
      const refreshed = await medicineAPI.getPatientLogs(patientId);
      setMedicineLogs(refreshed.data || []);
      setDeleteMedicineModal({ open: false, logId: null, busy: false, error: '' });
      showFeedback('Medicine log deleted.');
    } catch (e) {
      console.error(e);
      setDeleteMedicineModal((m) => ({ ...m, busy: false, error: e?.response?.data?.error || 'Delete failed' }));
      showFeedback('Failed to delete medicine log.');
    }
  };

  const saveCaseNotes = async () => {
    if (!caseNotesModal.flagId) return;
    try {
      const status = caseNotesModal.mode === 'resolve' ? 'resolved' : 'monitoring';
      if (String(currentUserProfile?.role || '').toLowerCase() === 'doctor') {
        if (caseNotesModal.mode === 'resolve') {
          await doctorAPI.resolveFlaggedCase(caseNotesModal.flagId, {
            doctor_notes: caseNotesModal.notes || 'Reviewed and resolved by doctor',
          });
        } else {
          await doctorAPI.saveCaseNotes(caseNotesModal.flagId, {
            doctor_notes: caseNotesModal.notes,
            status,
          });
        }
      } else {
        await flagAPI.updateCaseNotes(caseNotesModal.flagId, {
          notes: caseNotesModal.notes,
          status,
        });
      }
      setCaseNotesModal({ open: false, flagId: null, notes: '', mode: 'notes' });
      await refreshPatientWorkflow();
      showFeedback(caseNotesModal.mode === 'resolve' ? 'Case resolved.' : 'Case notes updated.');
    } catch (error) {
      console.error('Failed to update case notes', error);
      showFeedback('Failed to update case.');
    }
  };

  const escalateCaseToDoctor = async (flagId) => {
    try {
      await flagAPI.escalateToDoctor(flagId, {
        reason: 'Escalated from patient profile case management.',
      });
      await refreshPatientWorkflow();
      showFeedback('Case escalated to doctor.');
    } catch (error) {
      console.error('Failed to escalate case', error);
      showFeedback('Failed to escalate case.');
    }
  };

  const normalizeList = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
  };

  const patientName = profile?.full_name || user?.name || 'Patient';
  const village = user?.village_name || profile?.village_name;
  const allergies = normalizeList(profile?.allergies);
  const chronic = normalizeList(profile?.existing_diseases);

  useEffect(() => {
    if (loading) return;
    setTopbarMeta({
      navTitle: 'Patient Profile',
      title: 'Patient Profile',
      subtitle: `Patient ID ${patientId}`,
      breadcrumbs: ['ASHA Worker', 'Patients', 'Profile'],
    });
  }, [patientId, loading, setTopbarMeta]);

  useEffect(() => () => resetTopbarMeta(), [resetTopbarMeta]);

  if (loading) return <DashboardSkeleton />;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FaUser },
    { id: 'records', label: 'Health Records', icon: FaHeartbeat },
    { id: 'flags', label: 'Cases', icon: FaFlag },
    { id: 'medicine', label: 'Medicine Logs', icon: FaPills },
  ];

  const statItems = [
    { label: 'Age', value: profile?.age || user?.age || '—' },
    { label: 'Gender', value: profile?.gender || '—' },
    { label: 'Records', value: records.length },
    { label: 'Cases', value: healthcareCases.length || flaggedCases.length },
  ];

  return (
    <div className="page-container dashboard-stack">
      {feedback ? (
        <div className="rounded-xl border border-brand-500/25 bg-brand-500/10 px-4 py-3 text-sm text-brand-800 dark:text-brand-200">
          {feedback}
        </div>
      ) : null}
      <section className="patient-hero">
        <div className="patient-hero-banner" />
        <div className="patient-hero-body">
          <div className="patient-hero-grid">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="patient-avatar">{patientName.charAt(0).toUpperCase()}</div>
              <div className="min-w-0 pb-1">
                <h2 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{patientName}</h2>
                <p className="mt-1 text-sm text-muted-fg">Patient ID · {patientId}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="primary">
                    <FaMapMarkerAlt className="mr-1 inline h-3 w-3 opacity-70" />
                    {village || 'No village assigned'}
                  </Badge>
                  {flaggedCases.length > 0 && (
                    <Badge variant="danger">{flaggedCases.length} active flag(s)</Badge>
                  )}
                  {records.length > 0 && (
                    <Badge variant="info">{records.length} health record(s)</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link to={`/asha/health-record/add?patientId=${patientId}`}>
                <Button variant="secondary" size="sm">
                  <FaNotesMedical /> Add Record
                </Button>
              </Link>
              <Button variant="secondary" size="sm" onClick={openTimeline}>
                <FaClipboardList /> {t('Timeline')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowFlagModal(true)}>
                <FaFlag /> Flag Case
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statItems.map(({ label, value }) => (
              <div key={label} className="patient-stat-pill">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-fg">{label}</p>
                <p className="mt-1 text-lg font-semibold text-fg">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="patient-info-grid">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FaUser className="text-brand-400" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <dl className="space-y-4">
              {[
                ['Full name', patientName],
                ['Phone', profile?.phone || user?.phone || '—'],
                ['Gender', profile?.gender || '—'],
                ['Age', profile?.age || user?.age || '—'],
              ].map(([dt, dd]) => (
                <div key={dt} className="flex justify-between gap-4 border-b border-default pb-3 last:border-0 last:pb-0">
                  <dt className="text-sm text-muted-fg">{dt}</dt>
                  <dd className="text-right text-sm font-medium text-fg">{dd}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FaHeartbeat className="text-teal-400" />
                Clinical Summary
              </CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div className="rounded-xl border border-default bg-card-secondary p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-fg">
                  <FaExclamationTriangle className="text-amber-400" />
                  Allergies
                </div>
                <p className="text-sm text-fg-secondary">
                  {allergies.length ? allergies.join(', ') : 'None reported'}
                </p>
              </div>
              <div className="rounded-xl border border-default bg-card-secondary p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-fg">
                  <FaNotesMedical className="text-brand-400" />
                  Chronic conditions
                </div>
                <p className="text-sm text-fg-secondary">
                  {chronic.length ? chronic.join(', ') : 'None reported'}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-default bg-card-secondary p-4">
                <FaPhone className="h-4 w-4 text-muted-fg" />
                <div>
                  <p className="text-xs text-muted-fg">Emergency contact</p>
                  <p className="text-sm font-medium text-fg">{profile?.phone || user?.phone || '—'}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="dashboard-stack">
          <VillagerHealthRecords
            records={records}
            documents={documents}
            prescriptions={prescriptions}
            cases={healthcareCases}
            loading={false}
            userProfile={{ id: patientId, name: patientName }}
            onExportPdf={() => {}}
            recordRefs={{ current: {} }}
            allowCareActions
            onAddRecord={() => navigate(`/asha/health-record/add?patientId=${patientId}`)}
            onUploadDocument={() => setUploadPanel((prev) => ({ open: !prev.open, caseId: null }))}
          />

          {uploadPanel.open && (
            <MedicalDocumentsPanel
              patientId={patientId}
              caseId={uploadPanel.caseId}
              title={uploadPanel.caseId ? t('caseTitleWithId', { caseId: uploadPanel.caseId, title: t('Upload Document') }) : t('Upload Document')}
            />
          )}
        </div>
      )}

      {activeTab === 'medicine' && (
        <Card>
          <CardHeader>
            <CardTitle>Medicine Distribution Logs</CardTitle>
            <Badge variant="default">{medicineLogs.length} total</Badge>
          </CardHeader>
          {medicineLogs.length === 0 ? (
            <EmptyState
              icon={FaPills}
              title="No medicine logs yet"
              description="Medicine distribution entries will appear here for this patient."
            />
          ) : (
            <div className="space-y-3">
              {medicineLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-default bg-card-secondary p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-fg">{log.medicine_name}</p>
                      <p className="mt-1 text-xs text-muted-fg">
                        Qty {log.quantity} · {log.distributed_date ? new Date(log.distributed_date).toLocaleString() : '—'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEditMedicineLog(log)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => confirmDeleteMedicineLog(log.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  {log.notes ? <p className="mt-2 text-sm text-fg-secondary">{log.notes}</p> : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'flags' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('Patient Cases')}</CardTitle>
            {(healthcareCases.length > 0 || flaggedCases.length > 0) && (
              <Badge variant="danger">{healthcareCases.length || flaggedCases.length} case(s)</Badge>
            )}
          </CardHeader>
          {healthcareCases.length === 0 && flaggedCases.length === 0 ? (
            <EmptyState icon={FaFlag} title={t('No cases')} description={t('This patient has no active healthcare cases.')} />
          ) : (
            <div className="space-y-3">
              {(healthcareCases.length ? healthcareCases : flaggedCases).map((caseItem) => {
                const isHealthcareCase = healthcareCases.length > 0;
                const caseId = isHealthcareCase ? caseItem.id : caseItem.case_id || caseItem.id;
                const linkedFlags = flaggedCases.filter((f) =>
                  caseItem.case_id
                    ? String(f.case_id || '') === String(caseItem.case_id)
                    : String(f.case_id || f.id) === String(caseItem.id)
                );
                const flag = linkedFlags[0] || (caseItem.case_id ? flaggedCases.find((f) => String(f.case_id) === String(caseItem.case_id)) : caseItem);
                const caseRecords = records.filter((r) => String(r.case_id || '') === String(caseId));
                const caseDocs = documents.filter((d) => String(d.case_id || '') === String(caseId));
                const caseRx = prescriptions.filter((p) => String(p.case_id || '') === String(caseId));
                const caseEvents = caseTimeline.filter((event) => String(event.case_id || '') === String(caseId));
                const status = caseItem.status || caseItem.case_status || flag?.status || 'active';
                return (
                  <div key={caseId || flag?.id} className={cn(severityPanelClass(flag?.severity || caseItem.risk_level), 'space-y-3')}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {flag?.severity && <SeverityBadge severity={flag.severity} />}
                          <Badge variant={String(status).toLowerCase() === 'resolved' ? 'success' : 'warning'}>
                          {translateStatus(t, status)}
                          </Badge>
                          {caseId && <Badge variant="info">{t('caseNumber', { caseId })}</Badge>}
                        </div>
                        <p className="text-sm font-medium text-fg">
                          {caseItem.escalation_reason || caseItem.case_escalation_reason || flag?.escalation_reason || flag?.reason || 'Healthcare case'}
                        </p>
                        <p className="mt-2 text-xs text-muted-fg">
                          {t('Notes')}: {flag?.doctor_notes || caseItem.latest_doctor_notes || '—'}
                          {' · '}
                          {caseItem.created_at || flag?.date ? new Date(caseItem.created_at || flag?.date).toLocaleString() : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link to={`/asha/health-record/add?patientId=${patientId}${caseId ? `&caseId=${caseId}` : ''}`}>
                          <Button size="sm" variant="secondary">{t('Add Record')}</Button>
                        </Link>
                        <Button size="sm" variant="secondary" onClick={() => {
                          setActiveTab('records');
                          setUploadPanel({ open: true, caseId });
                        }}>
                          {t('Upload report')}
                        </Button>
                        {flag?.id && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setCaseNotesModal({ open: true, flagId: flag.id, notes: flag.doctor_notes || '', mode: 'notes' })}>
                              {t('Add notes')}
                            </Button>
                            {String(currentUserProfile?.role || '').toLowerCase() !== 'doctor' && (
                              <Button size="sm" variant="ghost" onClick={() => escalateCaseToDoctor(flag.id)}>
                                {t('Escalate')}
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setCaseNotesModal({ open: true, flagId: flag.id, notes: flag.doctor_notes || 'Reviewed and resolved', mode: 'resolve' })}>
                              {t('Resolve')}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 text-xs text-muted-fg sm:grid-cols-4">
                      <p>Records: {caseRecords.length}</p>
                      <p>{t('Reports')}: {caseDocs.length}</p>
                      <p>{t('Prescriptions')}: {caseRx.length}</p>
                      <p>{t('Timeline')}: {caseEvents.length}</p>
                    </div>

                    <div className="rounded-xl border border-default bg-card/60 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-fg">{t('Connected case history')}</p>
                      {caseEvents.slice(0, 4).map((event) => (
                        <p key={event.id} className="text-xs text-fg-secondary">
                          {event.created_at ? new Date(event.created_at).toLocaleString() : '—'} · {event.title || event.event_type}: {event.details || '—'}
                        </p>
                      ))}
                      {caseEvents.length === 0 && <p className="text-xs text-muted-fg">{t('No timeline events yet.')}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {showFlagModal && (
        <FlagCaseModal
          patientId={patientId}
          onClose={() => setShowFlagModal(false)}
          onFlagged={async () => {
            setShowFlagModal(false);
            await refreshPatientWorkflow();
            showFeedback('Case flagged successfully.');
          }}
        />
      )}

      {caseNotesModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md !bg-card !shadow-xl">
            <CardTitle>{caseNotesModal.mode === 'resolve' ? t('Resolve case') : t('Update case notes')}</CardTitle>
            <textarea
              className="input-field mt-3 w-full"
              rows={4}
              placeholder="Case notes..."
              value={caseNotesModal.notes}
              onChange={(e) => setCaseNotesModal((m) => ({ ...m, notes: e.target.value }))}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={saveCaseNotes}>
                {caseNotesModal.mode === 'resolve' ? t('Save & Resolve') : t('Save notes')}
              </Button>
              <Button variant="ghost" onClick={() => setCaseNotesModal({ open: false, flagId: null, notes: '', mode: 'notes' })}>
                {t('Cancel')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {editRecordModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-2xl !bg-card !shadow-xl">
            <CardTitle>Edit health record</CardTitle>
            {editRecordModal.error ? (
              <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {editRecordModal.error}
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                className="input-field"
                placeholder="Temperature"
                value={editRecordModal.record?.temperature ?? ''}
                onChange={(e) =>
                  setEditRecordModal((m) => ({ ...m, record: { ...m.record, temperature: e.target.value } }))
                }
              />
              <input
                className="input-field"
                placeholder="Blood Pressure"
                value={editRecordModal.record?.blood_pressure ?? ''}
                onChange={(e) =>
                  setEditRecordModal((m) => ({ ...m, record: { ...m.record, blood_pressure: e.target.value } }))
                }
              />
              <input
                className="input-field"
                placeholder="Pulse"
                value={editRecordModal.record?.pulse ?? ''}
                onChange={(e) =>
                  setEditRecordModal((m) => ({ ...m, record: { ...m.record, pulse: e.target.value } }))
                }
              />
              <input
                className="input-field"
                placeholder="Weight"
                value={editRecordModal.record?.weight ?? ''}
                onChange={(e) =>
                  setEditRecordModal((m) => ({ ...m, record: { ...m.record, weight: e.target.value } }))
                }
              />
              <input
                className="input-field"
                placeholder="Oxygen level (SpO₂)"
                value={editRecordModal.record?.oxygen_level ?? ''}
                onChange={(e) =>
                  setEditRecordModal((m) => ({ ...m, record: { ...m.record, oxygen_level: e.target.value } }))
                }
              />
              <input
                className="input-field"
                placeholder="Visit type"
                value={editRecordModal.record?.visit_type ?? ''}
                onChange={(e) =>
                  setEditRecordModal((m) => ({ ...m, record: { ...m.record, visit_type: e.target.value } }))
                }
              />
            </div>
            <input
              className="input-field mt-3"
              placeholder="Symptoms"
              value={editRecordModal.record?.symptoms ?? ''}
              onChange={(e) =>
                setEditRecordModal((m) => ({ ...m, record: { ...m.record, symptoms: e.target.value } }))
              }
            />
            <input
              className="input-field mt-3"
              placeholder="Medicines given"
              value={editRecordModal.record?.medicines_given ?? ''}
              onChange={(e) =>
                setEditRecordModal((m) => ({ ...m, record: { ...m.record, medicines_given: e.target.value } }))
              }
            />
            <textarea
              className="input-field mt-3"
              rows={3}
              placeholder="Notes"
              value={editRecordModal.record?.notes ?? ''}
              onChange={(e) => setEditRecordModal((m) => ({ ...m, record: { ...m.record, notes: e.target.value } }))}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={saveEditedRecord} loading={editRecordModal.saving}>
                {editRecordModal.saving ? 'Saving…' : 'Save changes'}
              </Button>
              <Button variant="ghost" onClick={() => setEditRecordModal({ open: false, record: null, saving: false, error: '' })}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {deleteRecordModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md !bg-card !shadow-xl">
            <CardTitle>Delete health record?</CardTitle>
            <p className="mt-2 text-sm text-muted-fg">This will permanently remove the selected record.</p>
            {deleteRecordModal.error ? (
              <p className="mt-3 text-sm text-red-400">{deleteRecordModal.error}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={deleteRecord} loading={deleteRecordModal.busy}>
                {deleteRecordModal.busy ? 'Deleting…' : 'Confirm delete'}
              </Button>
              <Button variant="ghost" onClick={() => setDeleteRecordModal({ open: false, recordId: null, busy: false, error: '' })}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {editMedicineModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-xl !bg-card !shadow-xl">
            <CardTitle>Edit medicine log</CardTitle>
            {editMedicineModal.error ? <p className="mt-3 text-sm text-red-400">{editMedicineModal.error}</p> : null}
            <input
              className="input-field mt-4"
              placeholder="Medicine name"
              value={editMedicineModal.log?.medicine_name ?? ''}
              onChange={(e) =>
                setEditMedicineModal((m) => ({ ...m, log: { ...m.log, medicine_name: e.target.value } }))
              }
            />
            <input
              type="number"
              min="1"
              className="input-field mt-3"
              placeholder="Quantity"
              value={editMedicineModal.log?.quantity ?? 1}
              onChange={(e) => setEditMedicineModal((m) => ({ ...m, log: { ...m.log, quantity: e.target.value } }))}
            />
            <textarea
              className="input-field mt-3"
              rows={3}
              placeholder="Notes"
              value={editMedicineModal.log?.notes ?? ''}
              onChange={(e) => setEditMedicineModal((m) => ({ ...m, log: { ...m.log, notes: e.target.value } }))}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={saveEditedMedicineLog} loading={editMedicineModal.saving}>
                {editMedicineModal.saving ? 'Saving…' : 'Save changes'}
              </Button>
              <Button variant="ghost" onClick={() => setEditMedicineModal({ open: false, log: null, saving: false, error: '' })}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {deleteMedicineModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md !bg-card !shadow-xl">
            <CardTitle>Delete medicine log?</CardTitle>
            <p className="mt-2 text-sm text-muted-fg">This will permanently remove the selected entry.</p>
            {deleteMedicineModal.error ? <p className="mt-3 text-sm text-red-400">{deleteMedicineModal.error}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={deleteMedicineLog} loading={deleteMedicineModal.busy}>
                {deleteMedicineModal.busy ? 'Deleting…' : 'Confirm delete'}
              </Button>
              <Button variant="ghost" onClick={() => setDeleteMedicineModal({ open: false, logId: null, busy: false, error: '' })}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      <CaseTimelineModal
        open={timelineModal.open}
        title={t('Medical History Timeline')}
        subtitle={`${patientName} · Patient ID ${patientId}`}
        items={timelineModal.items}
        loading={timelineModal.loading}
        error={timelineModal.error}
        onClose={() => setTimelineModal({ open: false, loading: false, error: '', items: [] })}
      />
    </div>
  );
}

export default PatientProfile;
