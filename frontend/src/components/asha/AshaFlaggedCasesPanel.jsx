import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBrain,
  FaCheck,
  FaExclamationTriangle,
  FaFlag,
  FaNotesMedical,
} from 'react-icons/fa';
import { caseAPI, flagAPI } from '../../services/api';
import Card, { CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import FlagCaseModal from '../FlagCaseModal';
import CaseTimelineModal from '../CaseTimelineModal';
import {
  getCaseStatus,
  getEscalationSource,
  getLifecycleStatus,
  isDoctorEscalated,
  lifecycleBadgeVariant,
} from '../../pages/doctor/doctorUtils';
import { useLanguage } from '../../context/LanguageContext';

const groupByHealthcareCaseId = (items) => {
  const map = new Map();
  (items || []).forEach((item) => {
    const normalized = {
      ...item,
      patient_id: item.patient_id ?? item.user_id,
    };
    const healthcareCaseId = normalized.case_id || normalized.id;
    if (!map.has(healthcareCaseId)) map.set(healthcareCaseId, { healthcareCaseId, items: [] });
    map.get(healthcareCaseId).items.push(normalized);
  });

  const groups = [...map.values()];
  groups.forEach((group) => {
    group.items.sort((a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0));
    group.representative = group.items[0];
  });
  groups.sort(
    (a, b) =>
      new Date(b.representative?.created_at || b.representative?.date || 0) -
      new Date(a.representative?.created_at || a.representative?.date || 0)
  );
  return groups;
};

export default function AshaFlaggedCasesPanel({
  maxItems,
  showCreateButton = false,
  title,
  description,
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [cases, setCases] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [queueTab, setQueueTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showFlagCase, setShowFlagCase] = useState(false);
  const [notesModal, setNotesModal] = useState({ open: false, caseId: null, notes: '' });
  const [timelineModal, setTimelineModal] = useState({
    open: false,
    loading: false,
    error: '',
    items: [],
    title: '',
    subtitle: '',
  });

  const load = async () => {
    try {
      setLoading(true);
      const res = await flagAPI.getAllFlagged();
      setCases(res.data || []);
    } catch (error) {
      console.error('Error loading flagged cases:', error);
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const showFeedback = (message) => {
    setFeedback(message);
    setTimeout(() => setFeedback(''), 3000);
  };

  const refreshAfterAction = (message) => {
    load();
    showFeedback(message);
  };

  const saveNotes = async () => {
    if (!notesModal.caseId) return;
    try {
      await flagAPI.updateCaseNotes(notesModal.caseId, {
        notes: notesModal.notes,
        status: 'monitoring',
      });
      setNotesModal({ open: false, caseId: null, notes: '' });
      refreshAfterAction(t('Follow-up notes saved.'));
    } catch (error) {
      console.error(error);
      showFeedback(t('Failed to save notes.'));
    }
  };

  const markVisited = async (caseId) => {
    try {
      await flagAPI.updateCaseNotes(caseId, { notes: t('Visited by ASHA'), status: 'visited' });
      refreshAfterAction(t('Case marked as visited.'));
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
      refreshAfterAction(t('Case escalated to doctor.'));
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
      refreshAfterAction(t('Case marked as resolved.'));
    } catch (error) {
      console.error(error);
      showFeedback(t('Failed to resolve case.'));
    }
  };

  const openTimeline = async (flaggedCase) => {
    const healthcareCaseId = flaggedCase?.case_id || flaggedCase?.id;
    if (!healthcareCaseId) return;
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
      const items = (res.data || [])
        .map((item) => {
          const badge = item.event_type ? String(item.event_type).replaceAll('_', ' ') : undefined;
          const lowerTitle = String(item.title || '').toLowerCase();
          return {
            type: 'case',
            at: item.created_at,
            title: item.title || t('Case event'),
            detail: item.details || '',
            badge,
            badgeVariant: lowerTitle.includes('resolve')
              ? 'success'
              : lowerTitle.includes('escalat')
              ? 'danger'
              : lowerTitle.includes('follow')
              ? 'warning'
              : 'info',
            meta: item.actor_name ? `${t('By')} ${item.actor_name}` : undefined,
          };
        })
        .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
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

  const groups = groupByHealthcareCaseId(cases);
  const activeGroups = groups.filter((group) => getCaseStatus(group.representative) !== 'resolved');
  const resolvedGroups = groups.filter((group) => getCaseStatus(group.representative) === 'resolved');
  const aiGroups = activeGroups.filter((group) => {
    const item = group.representative;
    const source = String(item?.source || '').toLowerCase();
    const triage = String(item?.triage_status || '').toUpperCase();
    return source === 'ai_triage' || triage === 'ASHA_REVIEW';
  });
  const doctorGroups = activeGroups.filter((group) => {
    const item = group.representative;
    const triage = String(item?.triage_status || '').toUpperCase();
    const caseStatus = String(item?.case_status || '').toUpperCase();
    return triage === 'DOCTOR_ESCALATED' || caseStatus === 'DOCTOR_ESCALATED';
  });
  const escalatedGroups = activeGroups.filter((group) => isDoctorEscalated(group.representative));

  const filteredGroups =
    queueTab === 'ai'
      ? aiGroups
      : queueTab === 'doctor'
      ? doctorGroups
      : queueTab === 'escalated'
      ? escalatedGroups
      : queueTab === 'resolved'
      ? resolvedGroups
      : activeGroups;

  const visibleGroups = typeof maxItems === 'number' ? filteredGroups.slice(0, maxItems) : filteredGroups;

  const filters = [
    { id: 'all', label: `${t('All Active')} (${activeGroups.length})` },
    { id: 'ai', label: `${t('AI')} (${aiGroups.length})` },
    { id: 'doctor', label: `${t('Doctor')} (${doctorGroups.length})` },
    { id: 'escalated', label: `${t('Escalated')} (${escalatedGroups.length})` },
    { id: 'resolved', label: `${t('Resolved')} (${resolvedGroups.length})` },
  ];

  return (
    <>
      {feedback && (
        <div className="rounded-xl border border-brand-500/25 bg-brand-500/10 px-4 py-3 text-sm text-brand-800 dark:text-brand-200">
          {feedback}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaFlag className="text-red-500" />
            {title || t('Flagged Cases')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="warning">{filteredGroups.length} {t('case(s)')}</Badge>
            {showCreateButton && (
              <Button size="sm" variant="outline" onClick={() => setShowFlagCase(true)}>
                <FaFlag className="mr-1" /> {t('Flag Case')}
              </Button>
            )}
          </div>
        </CardHeader>

        {description && <p className="mb-4 text-sm text-muted-fg">{description}</p>}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setQueueTab(filter.id)}
              className={queueTab === filter.id ? 'filter-chip-active' : 'filter-chip'}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-fg">{t('Loading flagged cases...')}</p>
        ) : filteredGroups.length === 0 ? (
          <EmptyState
            icon={FaBrain}
            title={t('No flagged cases')}
            description={t('No cases match the selected filter.')}
          />
        ) : (
          <div className="space-y-3">
            {visibleGroups.map((group) => {
              const item = group.representative;
              const patientId = item.patient_id || item.user_id;
              const isResolved = getCaseStatus(item) === 'resolved';
              return (
                <div
                  key={group.healthcareCaseId}
                  className={isDoctorEscalated(item) ? 'severity-panel-critical' : 'severity-panel-moderate'}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-fg">{item.patient_name || item.name || t('Patient')}</h4>
                    <Badge variant={isDoctorEscalated(item) ? 'danger' : 'warning'}>
                      {isDoctorEscalated(item) ? t('Doctor Escalation') : t('ASHA Monitoring')}
                    </Badge>
                  </div>
                  <p className="mb-2 text-sm text-fg-secondary">{item.symptoms_summary || item.reason}</p>
                  <p className="mt-1 text-xs text-muted-fg">{t('Source')}: {getEscalationSource(item)}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-fg">
                    <span>{t('ID')}: {patientId}</span>
                    {item.case_id ? <span>{t('caseNumber', { caseId: item.case_id })}</span> : null}
                    <span className="flex items-center gap-2">
                      {t('Status')}:
                      <Badge variant={lifecycleBadgeVariant(getLifecycleStatus(item))}>
                        {getLifecycleStatus(item).replaceAll('_', ' ')}
                      </Badge>
                    </span>
                    <span>{item.village_name || '-'}</span>
                    <span>{new Date(item.created_at || item.date).toLocaleString()}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => navigate(`/patient/${patientId}`)}>
                      {isResolved ? t('Open case') : t('Manage case')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        navigate(`/asha/health-record/add?patientId=${patientId}${item.case_id ? `&caseId=${item.case_id}` : ''}`)
                      }
                    >
                      {t('Add Record')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/patient/${patientId}`)}>
                      {t('Reports')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openTimeline(item)}>
                      {t('Timeline')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setNotesModal({ open: true, caseId: item.id, notes: item.doctor_notes || '' })}
                    >
                      <FaNotesMedical className="mr-1" /> {t('Notes')}
                    </Button>
                    {!isResolved && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => markVisited(item.id)}>
                          <FaCheck className="mr-1" /> {t('Visited')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => escalateToDoctor(item.id)}>
                          <FaExclamationTriangle className="mr-1" /> {t('Escalate')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => resolveCase(item.id)}>
                          <FaCheck className="mr-1" /> {t('Resolve')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {typeof maxItems === 'number' && filteredGroups.length > maxItems && (
              <Button variant="secondary" size="sm" className="w-full" onClick={() => navigate('/asha/flagged-cases')}>
                {t('View all flagged cases')}
              </Button>
            )}
          </div>
        )}
      </Card>

      {notesModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardTitle>{t('ASHA follow-up notes')}</CardTitle>
            <textarea
              className="input-field mt-3 w-full"
              rows={4}
              placeholder={t('Visit notes, observations, follow-up plan...')}
              value={notesModal.notes}
              onChange={(event) => setNotesModal((modal) => ({ ...modal, notes: event.target.value }))}
            />
            <div className="mt-4 flex gap-2">
              <Button onClick={saveNotes}>{t('Save')}</Button>
              <Button variant="ghost" onClick={() => setNotesModal({ open: false, caseId: null, notes: '' })}>
                {t('Cancel')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showFlagCase && (
        <FlagCaseModal
          onClose={() => setShowFlagCase(false)}
          onFlagged={() => {
            setShowFlagCase(false);
            load();
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
    </>
  );
}
