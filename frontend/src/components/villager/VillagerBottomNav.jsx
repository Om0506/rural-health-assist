import { FaClipboardList, FaCommentDots, FaHeartbeat, FaHome, FaUser } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import { cn } from '../../utils/cn';

const ITEMS = [
  { id: 'home', tab: 'chatbot', icon: FaHome, labelKey: 'Home' },
  { id: 'cases', tab: 'cases', icon: FaClipboardList, labelKey: 'Cases' },
  { id: 'ask', tab: 'chatbot', icon: FaCommentDots, labelKey: 'Ask', fab: true },
  { id: 'records', tab: 'records', icon: FaHeartbeat, labelKey: 'Health Records' },
  { id: 'profile', tab: 'profile', icon: FaUser, labelKey: 'Profile' },
];

export default function VillagerBottomNav({ activeTab, onNavigate, onAsk }) {
  const { t } = useLanguage();

  const isActive = (item) => {
    if (item.id === 'ask') return activeTab === 'chatbot';
    if (item.id === 'home' || item.id === 'assistant') return activeTab === 'chatbot';
    return activeTab === item.tab;
  };

  const handleClick = (item) => {
    if (item.fab) {
      onNavigate('chatbot');
      onAsk?.();
      return;
    }
    if (item.id === 'home') {
      onNavigate('chatbot');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    onNavigate(item.tab);
  };

  return (
    <nav className="villager-bottom-nav md:hidden" aria-label="Quick navigation">
      <div className="villager-bottom-nav-inner">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          if (item.fab) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleClick(item)}
                className="villager-bottom-fab"
                aria-label={t(item.labelKey)}
              >
                <span className="villager-bottom-fab-btn">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="villager-bottom-label">{t(item.labelKey)}</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item)}
              className={cn('villager-bottom-item', active && 'villager-bottom-item--active')}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="villager-bottom-label">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
