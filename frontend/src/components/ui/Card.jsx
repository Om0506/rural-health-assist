import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function Card({ children, className, hover = false, animate = true, ...props }) {
  const Component = animate ? motion.div : 'div';
  const motionProps = animate
    ? { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22 } }
    : {};

  return (
    <Component
      className={cn(hover ? 'card-hover' : 'card', className)}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ children, className }) {
  return <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>{children}</div>;
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={cn('text-base font-semibold tracking-tight text-fg sm:text-lg', className)}>
      {children}
    </h3>
  );
}
