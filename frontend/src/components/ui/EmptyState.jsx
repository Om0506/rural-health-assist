import { motion } from 'framer-motion';
import Button from './Button';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
    >
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-card-secondary">
          <Icon className="h-6 w-6 text-muted-fg" />
        </div>
      )}
      <h3 className="mb-2 text-base font-semibold text-fg">{title}</h3>
      {description && <p className="mb-6 max-w-sm text-sm text-muted-fg">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="sm">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
