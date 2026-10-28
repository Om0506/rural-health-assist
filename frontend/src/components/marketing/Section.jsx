import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function Section({
  id,
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className,
  children,
}) {
  const center = align === 'center';

  return (
    <section id={id} className={cn('py-14 sm:py-18 lg:py-24', className)}>
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
        {(eyebrow || title || subtitle) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn('mb-10 sm:mb-12', center && 'text-center')}
          >
            {eyebrow && (
              <div className={cn('mb-3 inline-flex items-center', center && 'justify-center')}>
                <span className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700 shadow-soft backdrop-blur dark:border-brand-500/20 dark:bg-slate-900/40 dark:text-brand-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-brand-600 to-teal-500" />
                  {eyebrow}
                </span>
              </div>
            )}
            {title && (
              <h2 className={cn('text-3xl font-semibold tracking-tight text-fg sm:text-4xl', center && 'mx-auto max-w-3xl')}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p className={cn('mt-3 text-sm leading-relaxed text-muted-fg sm:text-base', center ? 'mx-auto max-w-3xl' : 'max-w-2xl')}>
                {subtitle}
              </p>
            )}
          </motion.div>
        )}

        {children}
      </div>
    </section>
  );
}

