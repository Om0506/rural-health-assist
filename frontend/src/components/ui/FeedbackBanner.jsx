import { cn } from '../../utils/cn';

const styles = {
  success:
    'border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  error: 'border-red-500/25 bg-red-500/10 text-red-400',
  info: 'border-brand-500/25 bg-brand-500/10 text-brand-800 dark:text-brand-200',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200',
};

export default function FeedbackBanner({ message, variant = 'info', className, role = 'status' }) {
  if (!message) return null;
  const v = styles[variant] || styles.info;
  return (
    <div
      className={cn('rounded-xl border px-4 py-3 text-sm', v, className)}
      role={variant === 'error' ? 'alert' : role}
      aria-live="polite"
    >
      {message}
    </div>
  );
}
