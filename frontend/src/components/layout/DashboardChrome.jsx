import { motion } from 'framer-motion';
import { FaBars, FaBell, FaChevronLeft, FaHospitalAlt, FaMoon, FaSun } from 'react-icons/fa';
import IconButton from './IconButton';
import TopbarLanguageSelect from './TopbarLanguageSelect';
import DashboardSearch from './DashboardSearch';
import TopbarUserMenu from './TopbarUserMenu';
import { useLanguage } from '../../context/LanguageContext';

export default function DashboardChrome({
  navTitle,
  displayName,
  initials,
  userEmail,
  hasPasswordProvider,
  onLogout,
  logoutLabel,
  changePasswordLabel,
  notificationCount,
  darkMode,
  onToggleTheme,
  onOpenSidebar,
  onGoBack,
  onNotificationClick,
  language,
  onLanguageChange,
  showBack,
  navRole,
  hideSidebar = false,
  showSearch = true,
}) {
  const { t } = useLanguage();

  return (
    <header className="dashboard-chrome">
      <div className={hideSidebar ? 'dashboard-topnav dashboard-topnav--villager' : 'dashboard-topnav'}>
        <div className="dashboard-topnav-left">
          {!hideSidebar && (
            <button type="button" onClick={onOpenSidebar} className="topbar-icon-btn lg:hidden" aria-label={t('Open menu')}>
              <FaBars className="h-[15px] w-[15px]" />
            </button>
          )}
          {hideSidebar ? (
            <div className="villager-topnav-brand">
              <div className="sidebar-brand-icon !h-9 !w-9 shrink-0">
                <FaHospitalAlt className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold text-fg">{t('Rural Health')}</span>
                <span className="block truncate text-[11px] text-muted-fg">{t('Your health, our priority')}</span>
              </div>
            </div>
          ) : (
            <>
              {showBack && (
                <button type="button" onClick={onGoBack} className="topbar-icon-btn" aria-label={t('Go back')}>
                  <FaChevronLeft className="h-[15px] w-[15px]" />
                </button>
              )}
              <h1 className="dashboard-topnav-title">{navTitle}</h1>
            </>
          )}
        </div>

        {showSearch && (
          <div className="dashboard-topnav-center">
            <DashboardSearch role={navRole} />
          </div>
        )}

        <div className="topbar-actions">
          <IconButton label={darkMode ? t('Light mode') : t('Dark mode')} onClick={onToggleTheme}>
            <motion.span
              key={darkMode ? 'sun' : 'moon'}
              initial={{ rotate: -12, opacity: 0.65 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.16 }}
              className="flex items-center justify-center"
            >
              {darkMode ? <FaSun className="h-[15px] w-[15px]" /> : <FaMoon className="h-[15px] w-[15px]" />}
            </motion.span>
          </IconButton>

          <TopbarLanguageSelect value={language} onChange={onLanguageChange} className="hidden sm:flex" />

          <IconButton label={t('Notifications')} badge={notificationCount} onClick={onNotificationClick}>
            <FaBell className="h-[15px] w-[15px]" />
          </IconButton>

          <TopbarUserMenu
            initials={initials}
            displayName={displayName}
            userEmail={userEmail}
            hasPasswordProvider={hasPasswordProvider}
            onLogout={onLogout}
            logoutLabel={logoutLabel}
            changePasswordLabel={changePasswordLabel}
          />

          <TopbarLanguageSelect value={language} onChange={onLanguageChange} className="flex sm:hidden" />
        </div>
      </div>
    </header>
  );
}
