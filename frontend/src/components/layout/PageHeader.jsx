import { motion } from 'framer-motion';

export default function PageHeader({ title, subtitle, actions, badge }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        {badge && (
          <span className="mb-2 inline-block rounded-lg bg-brand-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            {badge}
          </span>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-fg sm:text-base">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.div>
  );
}
