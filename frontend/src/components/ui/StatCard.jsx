import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const accentMap = {
  brand: {
    icon: 'text-brand-500 dark:text-brand-400',
    tile: 'bg-brand-500/10 dark:bg-brand-500/15',
    gradient: 'dark:shadow-dark-card',
  },
  teal: {
    icon: 'text-teal-600 dark:text-teal-400',
    tile: 'bg-teal-500/10 dark:bg-teal-500/15',
    gradient: '',
  },
  amber: {
    icon: 'text-amber-600 dark:text-amber-400',
    tile: 'bg-amber-500/10 dark:bg-amber-500/15',
    gradient: '',
  },
  red: {
    icon: 'text-red-500 dark:text-red-400',
    tile: 'bg-red-500/10 dark:bg-red-500/15',
    gradient: '',
  },
  emerald: {
    icon: 'text-emerald-600 dark:text-emerald-400',
    tile: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    gradient: '',
  },
};

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'brand', className }) {
  const accent = accentMap[color] || accentMap.brand;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-card)] border border-default bg-card p-4 shadow-soft dark:shadow-dark-soft sm:p-5',
        accent.gradient,
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-500/[0.04] to-transparent opacity-80 dark:from-brand-400/[0.06]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-fg">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-fg">{value}</p>
          {subtitle && <p className="mt-0.5 text-[11px] text-muted-fg">{subtitle}</p>}
          {trend && <p className="mt-2 text-xs font-medium text-emerald-500">{trend}</p>}
        </div>
        {Icon && (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', accent.tile)}>
            <Icon className={cn('h-[18px] w-[18px]', accent.icon)} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
