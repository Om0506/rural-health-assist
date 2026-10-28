import { useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { caseAPI, documentAPI, healthAPI, historyAPI, notificationAPI } from '../services/api';
import Chatbot from '../components/Chatbot';
import VillagerHero from '../components/villager/VillagerHero';
import VillagerTabNav from '../components/villager/VillagerTabNav';
import VillagerBottomNav from '../components/villager/VillagerBottomNav';
import VillagerHealthRecords from '../components/villager/VillagerHealthRecords';
import VillagerQRScreen from '../components/villager/VillagerQRScreen';
import VillagerProfileHub from '../components/villager/VillagerProfileHub';
import VillagerNotifications from '../components/villager/VillagerNotifications';
import { FaBell, FaClipboardList, FaHeartbeat, FaQrcode, FaRobot, FaUser } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTopbar } from '../context/TopbarContext';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { translateStatus } from '../utils/i18nHealthcare';

const HASH_TABS = {
  chatbot: 'chatbot',
  records: 'records',
  cases: 'cases',
  qr: 'qr',
  profile: 'profile',
  notifications: 'notifications',
};

function VillagerDashboard({ userProfile, user }) {
  const [healthRecords, setHealthRecords] = useState([]);
  const [medicalDocuments, setMedicalDocuments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [caseTimeline, setCaseTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chatbot');
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [patientCases, setPatientCases] = useState([]);
  const [askFocusTick, setAskFocusTick] = useState(0);
  const { t } = useLanguage();
  const { setTopbarMeta, resetTopbarMeta } = useTopbar();
  const location = useLocation();
  const recordRefs = useRef({});

  const applyHashTab = (hash) => {
    const key = hash?.replace('#', '');
    if (key && HASH_TABS[key]) setActiveTab(HASH_TABS[key]);
  };

  useEffect(() => {
    applyHashTab(location.hash);
  }, [location.hash]);

  useEffect(() => {
    if (userProfile) {
      loadHealthRecords();
      loadMedicalDocuments();
      loadHistoryBundle();
    }
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile?.id) return;
    caseAPI
      .getPatientCases(userProfile.id)
      .then((res) => setPatientCases(res.data || []))
      .catch(() => setPatientCases([]));
  }, [userProfile?.id]);

  useEffect(() => {
    if (!userProfile?.id) return;
    notificationAPI
      .get(userProfile.id)
      .then((res) => setNotificationUnread((res.data || []).filter((n) => !n.is_read).length))
      .catch(() => setNotificationUnread(0));
  }, [userProfile?.id]);

  const loadHealthRecords = async () => {
    try {
      const response = await healthAPI.getRecords(userProfile.id);
      setHealthRecords(response.data);
    } catch (error) {
      console.error('Error loading health records:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMedicalDocuments = async () => {
    try {
      const response = await documentAPI.listByPatient(userProfile.id);
      setMedicalDocuments(response.data || []);
    } catch (error) {
      console.error('Error loading medical documents:', error);
      setMedicalDocuments([]);
    }
  };

  const loadHistoryBundle = async () => {
    try {
      const response = await historyAPI.getPatientBundle(userProfile.id);
      setHealthRecords(response.data?.healthHistory || []);
      setMedicalDocuments(response.data?.documents || []);
      setPrescriptions(response.data?.prescriptions || []);
      setPatientCases(response.data?.healthcareCases || []);
      setCaseTimeline(response.data?.caseTimeline || []);
    } catch (error) {
      console.error('Error loading patient history bundle:', error);
      setPrescriptions([]);
      setCaseTimeline([]);
    }
  };

  const buildPrescriptionPdf = async (record, mode = 'download') => {
    const node = recordRefs.current[record.id];
    if (!node) return;

    const exportHost = document.createElement('div');
    exportHost.style.cssText =
      'position:fixed;left:-99999px;top:0;background:#fff;padding:18px;box-sizing:border-box';
    exportHost.style.width = `${node.offsetWidth + 36}px`;

    const exportCard = document.createElement('div');
    exportCard.style.cssText =
      'background:#fff;border:2px solid #e2e8f0;border-radius:12px;padding:14px;box-sizing:border-box';
    exportCard.appendChild(node.cloneNode(true));
    exportHost.appendChild(exportCard);
    document.body.appendChild(exportHost);

    const canvas = await html2canvas(exportHost, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    document.body.removeChild(exportHost);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const ratio = Math.min(usableWidth / canvas.width, usableHeight / canvas.height);
    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;
    pdf.addImage(imgData, 'PNG', (pageWidth - imgWidth) / 2, margin, imgWidth, imgHeight);

    const dateStr = new Date(record.created_at || record.date).toISOString().split('T')[0];
    const safeName = (userProfile.name || 'patient').replace(/\s+/g, '_');
    pdf.save(`${mode === 'print' ? 'prescription_print' : 'patient_record'}_${safeName}_${dateStr}.pdf`);
  };

  useEffect(() => {
    if (!userProfile) return;
    setTopbarMeta({
      navTitle: t('My Health') || 'My Health',
      title: t('My Health') || 'My Health',
      subtitle: '',
      breadcrumbs: [],
      notificationCount: notificationUnread,
    });
  }, [userProfile, notificationUnread, setTopbarMeta, t]);

  useEffect(() => () => resetTopbarMeta(), [resetTopbarMeta]);

  if (!userProfile) return <DashboardSkeleton />;

  const firstName = (userProfile?.name || 'there').split(' ')[0];
  const isHomeView = activeTab === 'chatbot';

  const tabs = [
    { id: 'chatbot', label: t('AI Assistant'), shortLabel: t('AI'), icon: FaRobot },
    { id: 'records', label: t('Health Records'), shortLabel: t('Records'), icon: FaHeartbeat },
    { id: 'cases', label: t('My Cases') || 'My Cases', shortLabel: t('Cases') || 'Cases', icon: FaClipboardList },
    { id: 'qr', label: t('QR Health Card'), shortLabel: t('QR Card'), icon: FaQrcode },
    { id: 'profile', label: t('My Profile'), shortLabel: t('Profile'), icon: FaUser },
    {
      id: 'notifications',
      label: t('Notifications'),
      shortLabel: t('Alerts'),
      icon: FaBell,
      badge: notificationUnread,
    },
  ];

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const handleTabChange = (id) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setActiveTab(id);
    window.history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="villager-app">
      {isHomeView && <VillagerHero firstName={firstName} />}

      <VillagerTabNav tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

      <div className="villager-panel">
        {activeTab === 'chatbot' && (
          <div className="villager-chat-shell">
            <Chatbot userId={userProfile.id} variant="assistant" focusRequest={askFocusTick} />
          </div>
        )}

        {activeTab === 'records' && (
          <VillagerHealthRecords
            records={healthRecords}
            documents={medicalDocuments}
            prescriptions={prescriptions}
            cases={patientCases}
            loading={loading}
            userProfile={userProfile}
            onExportPdf={buildPrescriptionPdf}
            recordRefs={recordRefs}
          />
        )}

        {activeTab === 'cases' && (
          <MyCasesSection
            cases={patientCases}
            records={healthRecords}
            documents={medicalDocuments}
            prescriptions={prescriptions}
            timeline={caseTimeline}
          />
        )}

        {activeTab === 'qr' && (
          <VillagerQRScreen userId={userProfile.id} userProfile={userProfile} />
        )}

        {activeTab === 'profile' && (
          <VillagerProfileHub userProfile={userProfile} user={user} />
        )}

        {activeTab === 'notifications' && (
          <VillagerNotifications
            userId={userProfile.id}
            onUnreadCountChange={setNotificationUnread}
          />
        )}
      </div>

      <VillagerBottomNav
        activeTab={activeTab}
        onNavigate={handleTabChange}
        onAsk={() => setAskFocusTick((n) => n + 1)}
      />
    </div>
  );
}

export default VillagerDashboard;

function MyCasesSection({ cases, records, documents, prescriptions, timeline }) {
  const { t } = useLanguage();
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || null);

  useEffect(() => {
    if (!selectedCaseId && cases.length) setSelectedCaseId(cases[0].id);
    if (selectedCaseId && !cases.some((c) => String(c.id) === String(selectedCaseId))) {
      setSelectedCaseId(cases[0]?.id || null);
    }
  }, [cases, selectedCaseId]);

  const selectedCase = cases.find((c) => String(c.id) === String(selectedCaseId));
  const forCase = (items) => (items || []).filter((item) => String(item.case_id || '') === String(selectedCaseId));
  const caseRecords = forCase(records);
  const caseDocs = forCase(documents);
  const caseRx = forCase(prescriptions);
  const caseTimeline = forCase(timeline);

  return (
    <div className="villager-screen">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-fg">{t('My Cases')}</h2>
        <p className="mt-1 text-sm text-muted-fg">{t('Case status, reports, prescriptions, notes, records, and history in one place.')}</p>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-2xl border border-default bg-card p-6 text-sm text-muted-fg">
          {t('No cases have been opened for your profile yet.')}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {cases.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedCaseId(item.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  String(selectedCaseId) === String(item.id)
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-default bg-card hover:border-brand-500/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-fg">{t('caseNumber', { caseId: item.id })}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {translateStatus(t, item.status || 'ACTIVE')}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted-fg">
                  {item.escalation_reason || item.latest_update || t('Healthcare case')}
                </p>
              </button>
            ))}
          </div>

          {selectedCase && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-default bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-fg">{t('caseNumber', { caseId: selectedCase.id })}</h3>
                    <p className="mt-1 text-sm text-fg-secondary">{selectedCase.escalation_reason || t('Case details')}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {translateStatus(t, selectedCase.status || 'ACTIVE')}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-fg sm:grid-cols-2">
                  <p>{t('Doctor')}: {selectedCase.assigned_doctor_name || t('Not assigned')}</p>
                  <p>{t('ASHA')}: {selectedCase.assigned_asha_name || t('Not assigned')}</p>
                  <p>{t('Latest update')}: {selectedCase.latest_update || t('Case opened')}</p>
                  <p>{t('Reports')}: {caseDocs.length} · {t('Prescriptions')}: {caseRx.length}</p>
                </div>
              </div>

              <CaseList title={t('Prescriptions')} empty={t('No prescriptions for this case yet.')} items={caseRx} render={(rx) => (
                <>
                  <p className="font-medium text-fg">{t('prescriptionForCase', { caseId: selectedCase.id })}</p>
                  <p className="text-sm text-fg-secondary">{rx.medicine_name}{rx.dosage ? ` · ${rx.dosage}` : ''}{rx.duration ? ` · ${rx.duration}` : ''}</p>
                  <p className="text-xs text-muted-fg">{t('doctorName', { name: rx.doctor_name || t('Doctor') })} · {rx.created_at ? new Date(rx.created_at).toLocaleString() : '—'}</p>
                  {rx.instructions || rx.doctor_notes ? <p className="mt-1 text-sm text-fg-secondary">{rx.instructions || rx.doctor_notes}</p> : null}
                </>
              )} />

              <CaseList title={t('Uploaded Reports')} empty={t('No reports uploaded for this case.')} items={caseDocs} render={(doc) => (
                <>
                  <p className="font-medium text-fg">{doc.title || doc.original_name || t('Medical document')}</p>
                  <p className="text-xs text-muted-fg">{String(doc.category || 'document').replaceAll('_', ' ')} · {doc.created_at ? new Date(doc.created_at).toLocaleString() : '—'} · {t('Uploaded by')} {doc.uploaded_by_name || t('care team')}</p>
                  {doc.notes ? <p className="mt-1 text-sm text-fg-secondary">{doc.notes}</p> : null}
                </>
              )} />

              <CaseList title={t('Doctor Notes & Consultations')} empty={t('No consultation notes for this case yet.')} items={caseRecords.filter((r) => r.visit_type === 'doctor_visit' || r.doctor_id || r.diagnosis)} render={(record) => (
                <>
                  <p className="font-medium text-fg">{t('Doctor Consultation Notes')}</p>
                  <p className="text-sm text-fg-secondary">{record.diagnosis || record.notes || record.symptoms || t('Consultation recorded')}</p>
                  <p className="text-xs text-muted-fg">{t('doctorName', { name: record.doctor_name || t('Doctor') })} · {record.created_at ? new Date(record.created_at).toLocaleString() : '—'}</p>
                </>
              )} />

              <CaseList title={t('Health Records')} empty={t('No health records linked to this case.')} items={caseRecords} render={(record) => (
                <>
                  <p className="font-medium text-fg">{record.symptoms || record.visit_type || t('Health record')}</p>
                  <p className="text-sm text-fg-secondary">{record.notes || record.medicines_given || t('Record added')}</p>
                  <p className="text-xs text-muted-fg">{record.asha_name || record.doctor_name || t('Care team')} · {record.created_at ? new Date(record.created_at).toLocaleString() : '—'}</p>
                </>
              )} />

              <CaseList title={t('Timeline / History')} empty={t('No timeline events yet.')} items={caseTimeline} render={(event) => (
                <>
                  <p className="font-medium text-fg">{event.title || event.event_type || t('Case update')}</p>
                  <p className="text-sm text-fg-secondary">{event.details || '—'}</p>
                  <p className="text-xs text-muted-fg">{event.actor_name || t('Care team')} · {event.created_at ? new Date(event.created_at).toLocaleString() : '—'}</p>
                </>
              )} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CaseList({ title, empty, items, render }) {
  return (
    <section className="rounded-2xl border border-default bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-fg">{title}</h4>
        <span className="text-xs text-muted-fg">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-fg">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id || index} className="rounded-xl border border-default bg-card-secondary p-3">
              {render(item)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
