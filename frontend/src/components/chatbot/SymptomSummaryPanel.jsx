import { cn } from '../../utils/cn';

const severityColors = {
  Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Moderate: 'bg-amber-50 text-amber-800 border-amber-200',
  Severe: 'bg-orange-50 text-orange-800 border-orange-200',
  Critical: 'bg-red-50 text-red-700 border-red-200',
};

export default function SymptomSummaryPanel({ summary, t }) {
  if (!summary) return null;

  const memorySymptoms = summary.healthMemory?.currentSymptoms || [];
  const hasSymptoms = summary.symptoms?.length > 0 || memorySymptoms.length > 0;
  const displaySymptoms = hasSymptoms ? summary.symptoms?.length ? summary.symptoms : memorySymptoms : [];
  const risk = summary.triageLabel || summary.riskLevel || 'Assessing';
  const badgeClass = severityColors[risk] || 'bg-card-secondary text-fg-secondary border-default';

  return (
    <aside className="chat-symptom-panel" aria-label="Health assessment summary">
      <h4 className="chat-symptom-panel-title">{t('Health Summary')}</h4>

      <div className="chat-symptom-block">
        <p className="chat-symptom-label">{t('Current Symptoms')}</p>
        {hasSymptoms ? (
          <ul className="chat-symptom-list">
            {displaySymptoms.map((s) => (
              <li key={s}>✔ {s}</li>
            ))}
          </ul>
        ) : (
          <p className="chat-symptom-empty">{t('No symptoms recorded yet')}</p>
        )}
      </div>

      <div className="chat-symptom-block">
        <p className="chat-symptom-label">{t('Duration')}</p>
        <p className="chat-symptom-value">{summary.duration}</p>
      </div>

      <div className="chat-symptom-block">
        <p className="chat-symptom-label">{t('Risk Level')}</p>
        <span className={cn('chat-severity-badge', badgeClass)}>{summary.triageLabel || risk}</span>
        {typeof summary.riskScore === 'number' && (
          <p className="chat-symptom-note mt-1 text-xs">
            {t('Risk score')}: {summary.riskScore}/100
          </p>
        )}
      </div>

      {summary.trend && summary.trend !== 'stable' && (
        <div className="chat-symptom-block">
          <p className="chat-symptom-label">{t('Trend')}</p>
          <p className="chat-symptom-note capitalize">{summary.trend}</p>
        </div>
      )}

      {(summary.aiSummary || summary.severityReason) && (
        <div className="chat-symptom-block">
          <p className="chat-symptom-label">{t('AI summary')}</p>
          <p className="chat-symptom-note">{summary.aiSummary || summary.severityReason}</p>
        </div>
      )}

      {summary.recommendation && (
        <div className="chat-symptom-recommend">
          <p className="chat-symptom-label">{t('Recommendation')}</p>
          <p className="chat-symptom-note">{summary.recommendation}</p>
        </div>
      )}
    </aside>
  );
}
