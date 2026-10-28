import { cn } from '../../utils/cn';

export default function IconButton({ children, className, badge, label, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('topbar-icon-btn', className)}
      {...props}
    >
      {children}
      {badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-[var(--color-chrome)]">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
