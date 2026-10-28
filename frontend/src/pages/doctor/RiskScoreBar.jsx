import { cn } from '../../utils/cn';
import { resolveRiskScore, riskTone } from './doctorUtils';

export default function RiskScoreBar({ score, className, showLabel = true }) {
  const value = resolveRiskScore({ risk_score: score });
  const tone = riskTone(value);
  const barColor =
    tone === 'critical'
      ? 'bg-red-500'
      : tone === 'moderate'
        ? 'bg-amber-500'
        : 'bg-emerald-500';
  const textColor =
    tone === 'critical'
      ? 'text-red-600 dark:text-red-400'
      : tone === 'moderate'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-emerald-700 dark:text-emerald-400';

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-fg">Risk score</span>
          <span className={cn('font-semibold tabular-nums', textColor)}>{value}/100</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
