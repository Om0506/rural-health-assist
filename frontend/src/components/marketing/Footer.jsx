import { Link } from 'react-router-dom';
import { FaHospitalAlt } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { cn } from '../../utils/cn';

export default function Footer({ className }) {
  const { t } = useLanguage();

  const links = [
    { to: '/', label: t('Home') },
    { to: '/about', label: t('About') },
    { to: '/services', label: t('Services') },
    { to: '/contact', label: t('Contact') },
  ];

  return (
    <footer className={cn('border-t border-default', className)}>
      <div className="bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.10),transparent_55%),radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.12),transparent_55%)]">
        <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <div className="space-y-4">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-teal-500 shadow-glow">
                  <FaHospitalAlt className="h-5 w-5 text-white" />
                </span>
                <span className="text-base font-semibold tracking-tight text-fg">{t('Rural Healthcare')}</span>
              </Link>
              <p className="max-w-sm text-sm leading-relaxed text-muted-fg">
                {t('Home hero description')}
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-default bg-card-secondary px-3 py-1.5 text-xs font-medium text-fg-secondary">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t('Digital Healthcare for Rural India')}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 md:col-span-2 md:grid-cols-3">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{t('Platform')}</p>
                <ul className="space-y-2">
                  {links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className="text-sm font-medium text-fg-secondary hover:text-brand-600 transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{t('Services')}</p>
                <ul className="space-y-2 text-sm text-fg-secondary">
                  <li className="hover:text-brand-600 transition-colors">{t('AI Health Chatbot')}</li>
                  <li className="hover:text-brand-600 transition-colors">{t('Digital Health Card')}</li>
                  <li className="hover:text-brand-600 transition-colors">{t('Health Records')}</li>
                  <li className="hover:text-brand-600 transition-colors">{t('Alerts & Reminders')}</li>
                </ul>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{t('Contact')}</p>
                <div className="space-y-2 text-sm text-fg-secondary">
                  <p>{t('Mon-Sat, 9 AM - 6 PM')}</p>
                  <p className="font-semibold text-fg">{t('Emergency: 108')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-default pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-fg">
              © {new Date().getFullYear()} {t('Rural Healthcare Assistance')}. {t('All rights reserved')}.
            </p>
            <p className="text-xs text-muted-fg">
              {t('Care • Connect • Empower')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

