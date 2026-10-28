import { cn } from '../../utils/cn';

export default function VillagerFilterTabs({ tabs, active, onChange }) {
  return (
    <div className="villager-filter-scroll">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn('villager-filter-tab', active === tab.id && 'villager-filter-tab--active')}
        >
          {tab.label}
          {tab.count != null && tab.count > 0 && (
            <span className="villager-filter-count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
