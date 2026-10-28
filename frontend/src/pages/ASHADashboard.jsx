import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { caseAPI, flagAPI, notificationAPI, qrAPI } from '../services/api';
import {
  FaQrcode,
  FaFlag,
  FaPlusCircle,
  FaClipboardList,
  FaPills,
  FaHome,
  FaUserPlus,
  FaBell,
  FaSearch,
  FaCheck,
  FaExclamationTriangle,
  FaBrain,
  FaNotesMedical,
} from 'react-icons/fa';
import QRScannerModal from '../components/QRScannerModal';
import FlagCaseModal from '../components/FlagCaseModal';
import StatCard from '../components/ui/StatCard';
import QuickActionBar from '../components/ui/QuickActionBar';
import { useTopbar } from '../context/TopbarContext';
import Card, { CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { useScan } from '../context/ScanContext';
import { cn } from '../utils/cn';
import { getCaseStatus, getLifecycleStatus, lifecycleBadgeVariant, isDoctorEscalated, getEscalationSource } from './doctor/doctorUtils';
import CaseTimelineModal from '../components/CaseTimelineModal';
import AshaFlaggedCasesPanel from '../components/asha/AshaFlaggedCasesPanel';
import { useLanguage } from '../context/LanguageContext';

function ASHADashboard({ userProfile }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { registerScanHandler } = useScan();
  const { setTopbarMeta, resetTopbarMeta } = useTopbar();
  const [flaggedCases, setFlaggedCases] = useState([]);
  const [aiFlaggedCases, setAiFlaggedCases] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [topFlaggedFilter, setTopFlaggedFilter] = useState('all');
  const [notesModal, setNotesModal] = useState({ open: false, caseId: null, notes: '' });
  const [flaggedQueueTab, setFlaggedQueueTab] = useState('all');
  const [showScanner, setShowScanner] = useState(false);
  const [showFlagCase, setShowFlagCase] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const scanSessionRef = useRef(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationStatusFilter, setNotificationStatusFilter] = useState('all');
  const [notificationTypeFilter, setNotificationTypeFilter] = useState('all');
  const [timelineModal, setTimelineModal] = useState({ open: false, loading: false, error: '', items: [], title: '', subtitle: '' });

  const openScanner = useCallback(() => {
    scanSessionRef.current += 1;
    setShowScanner(true);
    setScanError('');
    setScanLoading(false);
  }, []);

  useEffect(() => {
    registerScanHandler(openScanner);
    return () => registerScanHandler(null);
  }, [registerScanHandler, openScanner]);

  useEffect(() => {
    loadFlaggedCases();
    loadAiFlaggedCases();
  }, []);

  useEffect(() => {
    if (userProfile?.id) loadNotifications();
  }, [userProfile?.id]);

  const loadFlaggedCases = async () => {
    try {
      const response = await flagAPI.getAllFlagged();
      setFlaggedCases(response.data || []);
    } catch (error) {
      console.error('Error loading flagged cases:', error);
    }
  };

  const loadAiFlaggedCases = async () => {
    try {
      const response = await flagAPI.getAiFlagged();
      setAiFlaggedCases(response.data || []);
    } catch (error) {
      console.error('Error loading AI flagged cases:', error);
      setAiFlaggedCases([]);
    }
  };

  const showFeedback = (message) => {
    setFeedback(message);
    setTimeout(() => setFeedback(''), 3000);
  };

  const saveCaseNotes = async () => {
    if (!notesModal.caseId) return;
    try {
      await flagAPI.updateCaseNotes(notesModal.caseId, {
        notes: notesModal.notes,
        status: 'monitoring',
      });
      setNotesModal({ open: false, caseId: null, notes: '' });
      showFeedback(t('Follow-up notes saved.'));
      loadFlaggedCases();
      loadAiFlaggedCases();
    } catch (error) {
      console.error(error);
      showFeedback(t('Failed to save notes.'));
    }
  };

  const markVisited = async (caseId) => {
    try {
      await flagAPI.updateCaseNotes(caseId, { notes: 'Visited by ASHA', status: 'visited' });
      showFeedback(t('Case marked as visited.'));
      loadFlaggedCases();
      loadAiFlaggedCases();
    } catch (error) {
      console.error(error);
      showFeedback(t('Failed to mark visited.'));
    }
  };

  const escalateToDoctor = async (caseId) => {
    try {
      await flagAPI.escalateToDoctor(caseId, {
        reason: t('ASHA manual escalation reason'),
      });
      showFeedback(t('Case escalated to doctor.'));
      loadFlaggedCases();
      loadAiFlaggedCases();
    } catch (error) {
      console.error(error);
      showFeedback(t('Failed to escalate case.'));
    }
  };

  const resolveCase = async (caseId) => {
    try {
      await flagAPI.updateCaseNotes(caseId, {
        notes: t('Resolved by ASHA'),
        status: 'resolved',
      });
      showFeedback(t('Case marked as resolved.'));
      loadFlaggedCases();
      loadAiFlaggedCases();
    } catch (error) {
      console.error(error);
      showFeedback(t('Failed to resolve case.'));
    }
  };

  const openTimeline = async (flaggedCase) => {
    const patientId = flaggedCase?.patient_id || flaggedCase?.user_id;
    const healthcareCaseId = flaggedCase?.case_id || flaggedCase?.id;
    if (!patientId || !healthcareCaseId) return;
    const patientName = flaggedCase?.patient_name || flaggedCase?.name || t('Patient');
    setTimelineModal({
      open: true,
      loading: true,
      error: '',
      items: [],
      title: t('Case Timeline'),
      subtitle: t('caseTimelineSubtitle', { patientName, caseId: healthcareCaseId }),
    });
    try {
      const res = await caseAPI.getTimeline(healthcareCaseId);
      const rows = res.data || [];

      const items = rows.map((event) => {
        const title = event.title || t('Case event');
        const detail = event.details || '';
        const badge = event.event_type ? String(event.event_type).replaceAll('_', ' ') : undefined;
        const lowerBadge = badge ? String(badge).toLowerCase() : '';

        const lowerTitle = String(title || '').toLowerCase();
        let badgeVariant = 'default';
        if (lowerTitle.includes('resolve')) badgeVariant = 'success';
        else if (lowerTitle.includes('escalat')) badgeVariant = 'danger';
        else if (lowerTitle.includes('prescription')) badgeVariant = 'primary';
        else if (lowerTitle.includes('follow')) badgeVariant = 'warning';
        else if (lowerBadge === 'report uploaded') badgeVariant = 'primary';
        else badgeVariant = 'info';

        return {
          type: 'case',
          at: event.created_at,
          title,
          detail,
          badge,
          badgeVariant,
          meta: event.actor_name ? `${t('By')} ${event.actor_name}` : undefined,
        };
      });

      items.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
      setTimelineModal((prev) => ({ ...prev, loading: false, items }));
    } catch (error) {
      console.error('Failed to load timeline', error);
      setTimelineModal((prev) => ({
        ...prev,
        loading: false,
        error: error?.response?.data?.error || t('Failed to load timeline'),
      }));
    }
  };

  const loadNotifications = async () => {
    if (!userProfile?.id) return;
    try {
      const response = await notificationAPI.get(userProfile.id);
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await notificationAPI.markRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item))
      );
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const isSupportedHealthcareQr = (decodedText) => {
    if (!decodedText || typeof decodedText !== 'string') return false;
    const raw = decodedText.trim();
    if (/^\/patient\/\d+$/.test(raw) || /^\d+$/.test(raw)) return true;
    try {
      const parsed = JSON.parse(raw);
      const hasPatientRef =
        Number.isFinite(Number(parsed?.patient_id)) ||
        Number.isFinite(Number(parsed?.userId)) ||
        (typeof parsed?.profile_url === 'string' && /^\/patient\/\d+$/.test(parsed.profile_url));
      const hasKnownType = parsed?.type === 'RHA_HEALTH_CARD' || parsed?.type === 'RHA_HEALTH_RECORD';
      return hasPatientRef && hasKnownType;
    } catch {
      return false;
    }
  };

  const handleQrScan = async (decoded) => {
    if (!decoded || scanLoading) return;
    const requestSession = scanSessionRef.current;
    setScanLoading(true);
    setScanError('');
    try {
      if (!isSupportedHealthcareQr(decoded)) throw new Error('UNSUPPORTED_QR');
      const response = await qrAPI.resolveScan(decoded);
      if (requestSession !== scanSessionRef.current) return false;
      const resolvedId = response.data?.patient?.id;
      if (!resolvedId || !Number.isFinite(Number(resolvedId))) throw new Error('Patient not resolved');
      setShowScanner(false);
      scanSessionRef.current += 1;
      window.location.assign(`/patient/${resolvedId}`);
      return true;
    } catch (error) {
      console.error('Error resolving scanned QR:', error);
      if (requestSession !== scanSessionRef.current) return false;
      if (error?.message === 'UNSUPPORTED_QR') {
        setScanError(t('Invalid QR for Rural Health. Please scan a valid patient QR code.'));
      } else {
        setScanError(error?.response?.data?.error || t('Unable to resolve scanned QR. Please try again.'));
      }
      return false;
    } finally {
      if (requestSession === scanSessionRef.current) setScanLoading(false);
    }
  };

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  useEffect(() => {
    if (!userProfile) return;
    setTopbarMeta({
      navTitle: t('Dashboard'),
      title: t('Dashboard'),
      subtitle: '',
      breadcrumbs: [],
      notificationCount: unreadCount,
    });
  }, [userProfile, unreadCount, setTopbarMeta, t]);

  useEffect(() => () => resetTopbarMeta(), [resetTopbarMeta]);

  if (!userProfile) return <DashboardSkeleton />;
  const firstName = (userProfile?.fullName || userProfile?.name || 'there').split(' ')[0];

  const groupByHealthcareCaseId = (items) => {
    const map = new Map();
    (items || []).forEach((it) => {
      const healthcareCaseId = it?.case_id || it?.id;
      if (!map.has(healthcareCaseId)) map.set(healthcareCaseId, { healthcareCaseId, items: [] });
      map.get(healthcareCaseId).items.push(it);
    });
    const groups = [...map.values()];
    groups.forEach((g) => {
      g.items.sort((a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0));
      g.representative = g.items[0];
    });
    groups.sort((a, b) => new Date(b.representative?.created_at || b.representative?.date || 0) - new Date(a.representative?.created_at || a.representative?.date || 0));
    return groups;
  };

  const normalizedFlaggedCases = (flaggedCases || []).map((item) => ({
    ...item,
    patient_id: item.patient_id ?? item.user_id,
  }));

  const caseGroups = groupByHealthcareCaseId(normalizedFlaggedCases);
  const activeCaseGroups = caseGroups.filter((g) => getCaseStatus(g.representative) !== 'resolved');
  const criticalCount = activeCaseGroups.filter((g) => isDoctorEscalated(g.representative)).length;
  const notificationTypes = Array.from(new Set((notifications || []).map((item) => item.type || 'system')));
  const filteredNotifications = (notifications || []).filter((item) => {
    const statusMatch =
      notificationStatusFilter === 'all' ||
      (notificationStatusFilter === 'unread' && !item.is_read) ||
      (notificationStatusFilter === 'read' && item.is_read);
    const typeMatch = notificationTypeFilter === 'all' || (item.type || 'system') === notificationTypeFilter;
    return statusMatch && typeMatch;
  });

  const quickActions = [
    { label: t('Scan Patient QR'), icon: FaQrcode, onClick: openScanner, variant: 'primary' },
    { label: t('Flagged Cases'), icon: FaFlag, to: '/asha/flagged-cases', variant: 'accent' },
    { label: t('Add Health Record'), icon: FaPlusCircle, to: '/asha/health-record/add', variant: 'teal' },
  ];

  const navCards = [
    { to: '/asha/flagged-cases', icon: FaBell, title: t('Flagged Cases'), desc: t('AI, doctor, and manual follow-ups') },
    { to: '/asha/village-records', icon: FaClipboardList, title: t('Village Records'), desc: t('View village stats and villagers') },
    { to: '/asha/medicine-log', icon: FaPills, title: t('Medicine Logs'), desc: t('Track medicine distribution') },
    { to: '/asha/patient-search', icon: FaSearch, title: t('Patient Search'), desc: t('Search by scan or ID') },
  ];

  const todayLabel = new Date().toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const resolvedCaseGroups = caseGroups.filter((g) => getCaseStatus(g.representative) === 'resolved');
  const aiEscalatedCaseGroups = activeCaseGroups.filter((g) => {
    const source = String(g.representative?.source || '').toLowerCase();
    const triage = String(g.representative?.triage_status || '').toUpperCase();
    return source === 'ai_triage' || triage === 'ASHA_REVIEW';
  });
  const doctorEscalatedCaseGroups = activeCaseGroups.filter((g) => {
    const triage = String(g.representative?.triage_status || '').toUpperCase();
    const caseStatus = String(g.representative?.case_status || '').toUpperCase();
    return triage === 'DOCTOR_ESCALATED' || caseStatus === 'DOCTOR_ESCALATED';
  });
  const escalatedCaseGroups = activeCaseGroups.filter((g) => isDoctorEscalated(g.representative));

  const filteredFlaggedCases =
    flaggedQueueTab === 'all'
      ? activeCaseGroups
      : flaggedQueueTab === 'ai'
      ? aiEscalatedCaseGroups
      : flaggedQueueTab === 'doctor'
      ? doctorEscalatedCaseGroups
      : flaggedQueueTab === 'resolved'
      ? resolvedCaseGroups
      : escalatedCaseGroups;

  const aiCaseGroups = groupByHealthcareCaseId(
    (aiFlaggedCases || []).map((item) => ({
      ...item,
      patient_id: item.patient_id ?? item.user_id,
    }))
  );
  const topFlaggedGroups =
    topFlaggedFilter === 'ai_escalated'
      ? caseGroups.filter((g) => {
          const item = g.representative;
          const source = String(item?.source || '').toLowerCase();
          const triage = String(item?.triage_status || '').toUpperCase();
          return source === 'ai_triage' || triage === 'ASHA_REVIEW';
        })
      : caseGroups;

  return (
    <div className="page-container dashboard-stack">
      <div className="dashboard-greeting">
        <div>
          <h2 className="dashboard-greeting-title">{t('Good morning')}, {firstName} 👋</h2>
          <p className="dashboard-greeting-sub">{t('Manage patient records and flagged cases in your village')}</p>
        </div>
        <span className="dashboard-date-pill">{todayLabel}</span>
      </div>

      <QuickActionBar actions={quickActions} />

      {feedback && (
        <div className="rounded-xl border border-brand-500/25 bg-brand-500/10 px-4 py-3 text-sm text-brand-800 dark:text-brand-200">
          {feedback}
        </div>
      )}

      <div className="dashboard-grid-stats">
        <StatCard title={t('AI Flagged')} value={aiCaseGroups.length} icon={FaBrain} color="amber" />
        <StatCard title={t('Flagged Cases')} value={activeCaseGroups.length} icon={FaFlag} color="brand" />
        <StatCard title={t('Critical')} value={criticalCount} icon={FaExclamationTriangle} color="red" />
        <StatCard title={t('Notifications')} value={unreadCount} subtitle={t('Unread')} icon={FaBell} color="brand" />
      </div>

      <div className="dashboard-grid-tools">
        {navCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.to} to={card.to}>
              <Card hover className="h-full !p-4">
                <div className="flex items-center gap-3">
                  <div className="icon-tile">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{card.title}</p>
                    <p className="truncate text-xs text-muted-fg">{card.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <AshaFlaggedCasesPanel
        maxItems={8}
        showCreateButton
        description={t('Manage flagged healthcare cases end-to-end with filtering, escalation tracking, notes, visits, and resolution.')}
      />

      <Card id="notifications" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaBell className="text-brand-500 dark:text-brand-400" />
            {t('Notifications')}
          </CardTitle>
          {unreadCount > 0 && <Badge variant="danger">{unreadCount} {t('Unread').toLowerCase()}</Badge>}
        </CardHeader>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {['all', 'unread', 'read'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setNotificationStatusFilter(f)}
              className={notificationStatusFilter === f ? 'filter-chip-active' : 'filter-chip'}
            >
              {f === 'all' ? t('All') : f === 'unread' ? t('Unread') : t('Read')}
            </button>
          ))}
          <select
            className="input-field ml-auto max-w-[180px] py-1.5 text-xs"
            value={notificationTypeFilter}
            onChange={(e) => setNotificationTypeFilter(e.target.value)}
          >
            <option value="all">{t('All Types')}</option>
            {notificationTypes.map((type) => (
              <option key={type} value={type}>
                {String(type).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {notifications.length === 0 ? (
          <EmptyState icon={FaBell} title={t('No notifications yet')} description={t('Care alerts will appear here')} />
        ) : filteredNotifications.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-fg">{t('No notifications match selected filters.')}</p>
        ) : (
          <div className="max-h-80 space-y-2.5 overflow-y-auto scrollbar-thin">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'notification-item',
                  !notification.is_read && 'notification-item--unread'
                )}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm', notification.is_read ? 'text-fg-secondary' : 'font-medium text-fg')}>
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm text-fg-secondary">{notification.message}</p>
                    <p className="mt-2 text-xs font-medium capitalize text-brand-500 dark:text-brand-400">
                      {String(notification.type || 'system').replaceAll('_', ' ')}
                    </p>
                    <p className="mt-1 text-xs text-muted-fg">
                      {notification.patient_name || '-'}
                      {notification.village_name ? ` · ${notification.village_name}` : ''}
                      {' · '}
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {!notification.is_read && (
                      <Button variant="ghost" size="sm" onClick={() => markNotificationRead(notification.id)}>
                        <FaCheck /> {t('Read')}
                      </Button>
                    )}
                    {notification.patient_id && (
                      <Button size="sm" onClick={() => navigate(`/patient/${notification.patient_id}`)}>
                        {t('Open Patient')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <QRScannerModal
        open={showScanner}
        onClose={() => {
          const hadScanError = Boolean(scanError);
          scanSessionRef.current += 1;
          setShowScanner(false);
          setScanLoading(false);
          setScanError('');
          if (hadScanError) window.location.assign('/dashboard/asha');
        }}
        onScanSuccess={handleQrScan}
        loading={scanLoading}
        error={scanError}
      />

      {showFlagCase && (
        <FlagCaseModal
          onClose={() => setShowFlagCase(false)}
          onFlagged={() => {
            setShowFlagCase(false);
            loadFlaggedCases();
            loadAiFlaggedCases();
          }}
        />
      )}

      <CaseTimelineModal
        open={timelineModal.open}
        title={timelineModal.title}
        subtitle={timelineModal.subtitle}
        items={timelineModal.items}
        loading={timelineModal.loading}
        error={timelineModal.error}
        onClose={() => setTimelineModal({ open: false, loading: false, error: '', items: [], title: '', subtitle: '' })}
      />
    </div>
  );
}

export default ASHADashboard;
