import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  outline: 'inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-brand-500/40 px-4 text-sm font-medium text-brand-600 transition-all duration-200 hover:bg-brand-500/10 dark:text-brand-400 disabled:opacity-50 active:scale-[0.98]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: '',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  loading = false,
  disabled,
  type = 'button',
  to,
  ...props
}) {
  const classes = cn(variants[variant], size !== 'md' && sizes[size], className);
  const content = (
    <>
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-disabled={disabled || loading || undefined}
        className={cn(classes, (disabled || loading) && 'pointer-events-none opacity-50')}
        {...props}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={classes}
      {...props}
    >
      {content}
    </button>
  );
}
