import { cn } from '../../utils/cn';

const variants = {
  default: 'bg-card-secondary text-fg-secondary border border-default',
  success: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
  warning: 'bg-amber-500/12 text-amber-800 dark:text-amber-300 border border-amber-500/20',
  danger: 'bg-red-500/12 text-red-700 dark:text-red-300 border border-red-500/20',
  info: 'bg-blue-500/12 text-blue-700 dark:text-blue-300 border border-blue-500/20',
  critical: 'bg-red-500/90 text-white border-0',
  moderate: 'bg-amber-500/90 text-white border-0',
  normal: 'bg-emerald-500/90 text-white border-0',
  primary: 'bg-brand-500/12 text-brand-700 dark:text-brand-300 border border-brand-500/20',
};

export default function Badge({ children, variant = 'default', className, dot = false }) {
  return (
    <span className={cn('badge', variants[variant] || variants.default, className)}>
      {dot && <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  const s = String(severity || '').toLowerCase();
  const map = {
    critical: 'critical',
    high: 'danger',
    moderate: 'warning',
    low: 'info',
    normal: 'normal',
  };
  return (
    <Badge variant={map[s] || 'default'}>
      {severity ? String(severity).toUpperCase() : 'UNKNOWN'}
    </Badge>
  );
}
