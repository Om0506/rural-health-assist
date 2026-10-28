import { cn } from '../../utils/cn';

export default function VillagerTabNav({ tabs, activeTab, onChange }) {
  return (
    <nav className="villager-tab-nav" aria-label="Health sections">
      <div className="villager-tab-track">
        <div className="villager-tab-nav-scroll" role="tablist">
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
                className={cn('villager-tab-btn', isActive && 'villager-tab-btn--active')}
              >
                {Icon && <Icon className="villager-tab-icon" aria-hidden />}
                <span className="villager-tab-label villager-tab-label--full hidden min-[480px]:inline">
                  {tab.label}
                </span>
                <span className="villager-tab-label villager-tab-label--short min-[480px]:hidden">
                  {tab.shortLabel || tab.label}
                </span>
                {tab.badge > 0 && (
                  <span className="villager-tab-badge">{tab.badge > 99 ? '99+' : tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
