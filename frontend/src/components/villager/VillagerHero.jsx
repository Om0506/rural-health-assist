import { FaHeart, FaShieldAlt, FaUserMd } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';

function HeroIllustration() {
  return (
    <div className="villager-hero-art" aria-hidden>
      <div className="villager-hero-art-bg" />
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <circle cx="60" cy="38" r="18" fill="#93c5fd" />
        <path d="M36 88c4-16 16-24 24-24s20 8 24 24" fill="#60a5fa" />
        <path d="M44 52c-2 4-6 6-10 5M76 52c2 4 6 6 10 5" stroke="#1d4ed8" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M52 44c2-2 6-2 8 0M68 44c2-2 6-2 8 0" stroke="#1e40af" strokeWidth="2" fill="none" />
        <circle cx="92" cy="28" r="10" fill="#bbf7d0" stroke="#22c55e" strokeWidth="1.5" />
        <path d="M88 28h8M92 24v8" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="24" cy="72" r="8" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
        <path d="M20 72h8M24 68v8" stroke="#2563eb" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function VillagerHero({ firstName }) {
  const { t } = useLanguage();

  const badges = [
    { icon: FaShieldAlt, label: t('Private & Secure'), tone: 'green' },
    { icon: FaUserMd, label: t('Trusted Guidance'), tone: 'purple' },
    { icon: FaHeart, label: t('Always Here'), tone: 'blue' },
  ];

  return (
    <section className="villager-hero">
      <div className="villager-hero-content">
        <h1 className="villager-hero-title">
          {t('Hello')}, {firstName} 👋
        </h1>
        <p className="villager-hero-sub">
          {t("We're here to help you stay healthy and informed.")}
        </p>
        <div className="villager-hero-badges">
          {badges.map(({ icon: Icon, label, tone }) => (
            <span key={label} className={`villager-hero-badge villager-hero-badge--${tone}`}>
              <Icon className="h-3 w-3 shrink-0" />
              {label}
            </span>
          ))}
        </div>
      </div>
      <HeroIllustration />
    </section>
  );
}
