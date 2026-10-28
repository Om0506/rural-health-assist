import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  FaBell,
  FaChartLine,
  FaExclamationTriangle,
  FaQrcode,
  FaStethoscope,
  FaUserInjured,
  FaUsers,
} from 'react-icons/fa';
import StatCard from '../../components/ui/StatCard';
import QuickActionBar from '../../components/ui/QuickActionBar';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { doctorAPI } from '../../services/api';
import useDoctorPageMeta from './useDoctorPageMeta';
import { formatSymptomsFromCase, resolveRiskScore } from './doctorUtils';
import RiskScoreBar from './RiskScoreBar';
import { useLanguage } from '../../context/LanguageContext';

function MiniBarChart({ items }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-fg">{item.label}</span>
            <span className="font-medium text-fg">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full ${item.color}`}
              style={{ width: `${Math.round((item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DoctorOverview() {
  const { userProfile, openScanner } = useOutletContext();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [overview, setOverview] = useState({
    totalPatients: 0,
    activeCases: 0,
    aiEscalatedCases: 0,
    ashaFollowUps: 0,
  });
  const [escalatedCases, setEscalatedCases] = useState([]);

  useDoctorPageMeta({
    title: t('Dashboard'),
    subtitle: t('Healthcare command overview'),
  });

  useEffect(() => {
    if (!userProfile?.id) return;
    loadOverview();
    loadEscalated();
  }, [userProfile?.id]);

  const loadOverview = async () => {
    try {
      const res = await doctorAPI.getOverview();
      setOverview(res.data || {});
    } catch (e) {
      console.error(e);
    }
  };

  const loadEscalated = async () => {
    try {
      const res = await doctorAPI.getEscalatedCases();
      setEscalatedCases(res.data || []);
    } catch (e) {
      console.error(e);
      setEscalatedCases([]);
    }
  };

  if (!userProfile) return <DashboardSkeleton />;

  const firstName = (userProfile?.name || t('Doctor')).split(' ')[0];
  const todayLabel = new Date().toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const quickActions = [
    { label: t('Scan Patient QR'), icon: FaQrcode, onClick: openScanner, variant: 'primary' },
    {
      label: t('AI Escalated Cases'),
      icon: FaExclamationTriangle,
      onClick: () => navigate('/doctor/escalated'),
      variant: 'accent',
    },
    {
      label: t('Patient Records'),
      icon: FaUsers,
      onClick: () => navigate('/doctor/patients'),
      variant: 'teal',
    },
  ];

  const chartItems = [
    { label: t('AI Escalated'), value: overview.aiEscalatedCases || 0, color: 'bg-red-500' },
    { label: t('ASHA Follow-Ups'), value: overview.ashaFollowUps || 0, color: 'bg-amber-500' },
    { label: t('Active Cases'), value: overview.activeCases || 0, color: 'bg-cyan-500' },
  ];

  return (
    <div className="page-container dashboard-stack">
      <div className="dashboard-greeting">
        <div>
          <h2 className="dashboard-greeting-title">{t('Good morning')}, {t('Dr.')} {firstName} 👋</h2>
          <p className="dashboard-greeting-sub">
            {t('AI triage routes only validated high-risk cases to your escalation queue.')}
          </p>
        </div>
        <span className="dashboard-date-pill">{todayLabel}</span>
      </div>

      <QuickActionBar actions={quickActions} />

      <div className="dashboard-grid-stats">
        <StatCard title={t('Total Patients')} value={overview.totalPatients} icon={FaUsers} color="brand" />
        <StatCard title={t('Active Cases')} value={overview.activeCases} icon={FaChartLine} color="teal" />
        <StatCard
          title={t('AI Escalated')}
          value={overview.aiEscalatedCases}
          icon={FaExclamationTriangle}
          color="red"
        />
        <StatCard title={t('ASHA Follow-Ups')} value={overview.ashaFollowUps} icon={FaStethoscope} color="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaExclamationTriangle className="text-red-500" />
              {t('Recent High-Risk Cases')}
            </CardTitle>
            {overview.aiEscalatedCases > 0 && (
              <Badge variant="danger">{overview.aiEscalatedCases} {t('Urgent').toLowerCase()}</Badge>
            )}
          </CardHeader>
          {escalatedCases.length === 0 ? (
            <EmptyState
              icon={FaUserInjured}
              title={t('No urgent escalations')}
              description={t('Validated high-risk cases (score ≥ 70) appear here.')}
            />
          ) : (
            <div className="space-y-3">
              {escalatedCases.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="severity-panel-high cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/patient/${item.patient_id || item.user_id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/patient/${item.patient_id || item.user_id}`)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-fg">{item.patient_name}</p>
                    <span className="text-xs text-muted-fg">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mb-2 text-sm text-fg-secondary">{formatSymptomsFromCase(item)}</p>
                  <RiskScoreBar score={resolveRiskScore(item)} />
                </div>
              ))}
              <Link to="/doctor/escalated">
                <Button variant="secondary" size="sm" className="w-full">
                  {t('View all escalated cases')}
                </Button>
              </Link>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaChartLine className="text-brand-500" />
              {t('Case Distribution')}
            </CardTitle>
          </CardHeader>
          <p className="text-xs text-muted-fg">{t('Overview of triage workload across your network.')}</p>
          <MiniBarChart items={chartItems} />
          <div className="mt-6 flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => navigate('/doctor/insights')}>
              {t('AI Insights')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/doctor/notifications')}>
              <FaBell className="mr-1" /> {t('Notifications')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
