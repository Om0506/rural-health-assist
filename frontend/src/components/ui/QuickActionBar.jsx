import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

const variantClass = {
  primary: 'quick-action-primary',
  secondary: 'quick-action-secondary',
  accent: 'quick-action-accent',
  teal: 'quick-action-teal',
};

export default function QuickActionBar({ actions, className }) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4', className)}>
      {actions.map((action) => {
        const Icon = action.icon;
        const variant = action.variant || 'secondary';
        const inner = (
          <>
            <Icon className="h-4 w-4 shrink-0 opacity-90" />
            <span>{action.label}</span>
          </>
        );
        const cls = variantClass[variant] || variantClass.secondary;

        if (action.to) {
          return (
            <Link key={action.label} to={action.to} className={cls}>
              {inner}
            </Link>
          );
        }

        return (
          <button key={action.label} type="button" onClick={action.onClick} className={cls}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
