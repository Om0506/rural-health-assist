import Card, { CardTitle } from './ui/Card';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';
import Badge from './ui/Badge';

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function CaseTimelineModal({ open, title, subtitle, items, loading, error, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-3xl !bg-card !shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{title || 'Medical history timeline'}</CardTitle>
            {subtitle ? <p className="mt-1 text-sm text-muted-fg">{subtitle}</p> : null}
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-muted-fg">Loading timeline…</p>
        ) : error ? (
          <p className="mt-6 text-sm text-red-400">{error}</p>
        ) : !items?.length ? (
          <div className="mt-6">
            <EmptyState
              title="No timeline entries yet"
              description="Health records, flags, visits, prescriptions, and uploads will appear here."
            />
          </div>
        ) : (
          <div className="mt-5 space-y-3 max-h-[65vh] overflow-y-auto scrollbar-thin pr-1">
            {items.map((t, idx) => {
              const when = normalizeDate(t.at);
              return (
                <div key={`${t.type || 'event'}-${idx}`} className="rounded-xl border border-default bg-card-secondary p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-fg">{t.title || 'Event'}</p>
                        {t.badge ? <Badge variant={t.badgeVariant || 'default'}>{t.badge}</Badge> : null}
                      </div>
                      {t.detail ? <p className="mt-1 text-sm text-fg-secondary">{t.detail}</p> : null}
                      {t.meta ? <p className="mt-2 text-xs text-muted-fg">{t.meta}</p> : null}
                    </div>
                    <p className="text-xs text-muted-fg">{when ? when.toLocaleString() : '—'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

