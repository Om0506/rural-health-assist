import { cn } from '../../utils/cn';

export default function Input({
  label,
  error,
  hint,
  required,
  icon: Icon,
  className,
  id,
  ...props
}) {
  const inputId = id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
        )}
        <input
          id={inputId}
          className={cn(
            'input-field',
            Icon && 'pl-10',
            error && 'border-red-400 focus:ring-red-500/30 focus:border-red-500',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Textarea({ label, error, required, className, id, rows = 3, ...props }) {
  const inputId = id || props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={cn('input-field resize-y min-h-[80px]', error && 'border-red-400', className)}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}

export function Select({ label, error, required, children, className, id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        id={inputId}
        className={cn('input-field appearance-none cursor-pointer', error && 'border-red-400', className)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}
