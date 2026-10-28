import { cn } from '../../utils/cn';

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function CardSkeleton() {
  return (
    <div className="card space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="page-container dashboard-stack">
      <Skeleton className="h-10 w-64" />
      <div className="dashboard-grid-stats">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <CardSkeleton />
    </div>
  );
}
