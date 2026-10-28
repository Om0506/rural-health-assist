import { cn } from '../../utils/cn';

export default function Tabs({ tabs, activeTab, onChange, className }) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1 rounded-xl border border-default bg-card-secondary/50 p-1',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-card text-fg shadow-soft dark:shadow-dark-soft'
                : 'text-fg-secondary hover:bg-hover hover:text-fg'
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0 opacity-80" />}
            <span className="truncate">{tab.label}</span>
            {tab.badge > 0 && (
              <span className="ml-0.5 min-w-[18px] rounded-full bg-red-500/90 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
