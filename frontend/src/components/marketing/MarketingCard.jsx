import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function MarketingCard({
  className,
  children,
  hover = true,
  glow = false,
  ...props
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -4 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={cn(
        'group relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-6 shadow-card backdrop-blur-xl',
        'dark:border-white/10 dark:bg-slate-900/40 dark:shadow-dark-card',
        glow && 'before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.22),transparent_55%)] before:opacity-0 before:transition-opacity before:duration-300 group-hover:before:opacity-100',
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-brand-500/20 to-teal-400/20 blur-2xl" />
      </div>
    </motion.div>
  );
}

