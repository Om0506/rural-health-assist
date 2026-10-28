import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FaBrain } from 'react-icons/fa';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import StatCard from '../../components/ui/StatCard';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { doctorAPI } from '../../services/api';
import useDoctorPageMeta from './useDoctorPageMeta';
import RiskScoreBar from './RiskScoreBar';
import { resolveRiskScore } from './doctorUtils';

export default function DoctorInsights() {
  const { userProfile } = useOutletContext();
  const navigate = useNavigate();
  const [insights, setInsights] = useState(null);

  useDoctorPageMeta({ title: 'AI Health Insights', subtitle: 'Symptom trends from structured chat data' });

  useEffect(() => {
    if (userProfile?.id) {
      doctorAPI
        .getInsights()
        .then((r) => setInsights(r.data))
        .catch(() => setInsights(null));
    }
  }, [userProfile?.id]);

  if (!userProfile) return <DashboardSkeleton />;

  return (
    <div className="page-container dashboard-stack">
      <div className="dashboard-grid-stats">
        <StatCard
          title="Fever Sessions (30d)"
          value={insights?.symptomTrends?.feverSessions ?? 0}
          icon={FaBrain}
          color="amber"
        />
        <StatCard
          title="Dehydration Alerts"
          value={insights?.dehydrationAlerts ?? 0}
          subtitle="14 days"
          icon={FaBrain}
          color="teal"
        />
        <StatCard
          title="Persistent Symptoms"
          value={insights?.persistentSymptomAlerts ?? 0}
          subtitle="ASHA band"
          icon={FaBrain}
          color="brand"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaBrain className="text-brand-500" />
            Recent AI symptom summaries
          </CardTitle>
        </CardHeader>
        <p className="mb-4 text-xs text-muted-fg">
          Based on structured chatbot data — not a clinical diagnosis.
        </p>
        {!insights?.recentAiSummaries?.length ? (
          <EmptyState
            icon={FaBrain}
            title="No summaries yet"
            description="Summaries appear after villagers use the health assistant."
          />
        ) : (
          <div className="space-y-3">
            {insights.recentAiSummaries.map((row) => {
              const score = resolveRiskScore({ risk_score: row.riskScore });
              return (
                <div
                  key={row.sessionId}
                  className="rounded-xl border border-default bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-fg">{row.patientName}</p>
                      <p className="text-sm text-muted-fg">
                        {row.villageName || '—'} · {row.summaryText}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant={score >= 70 ? 'danger' : score >= 30 ? 'warning' : 'success'}
                      >
                        {score}/100
                      </Badge>
                      <Button size="sm" onClick={() => navigate(`/patient/${row.patientId}`)}>
                        View
                      </Button>
                    </div>
                  </div>
                  <RiskScoreBar score={score} className="mt-3 max-w-xs" />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
