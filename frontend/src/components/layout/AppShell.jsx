import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { FaHospitalAlt, FaSignOutAlt, FaTimes } from 'react-icons/fa';
import { auth } from '../../utils/firebase';
import { getRoleNav } from '../../utils/roleNav';
import { getRouteMeta } from '../../utils/routeMeta';
import { cn } from '../../utils/cn';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useTopbar } from '../../context/TopbarContext';
import DashboardChrome from './DashboardChrome';

const SIDEBAR_WIDTH = 252;

export default function AppShell({ user, userProfile, children, onScanRequest }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { meta } = useTopbar();
  const nav = getRoleNav(userProfile);

  const displayName =
    userProfile?.fullName || userProfile?.name || user?.displayName || user?.email || 'User';
  const initials =
    (displayName || '')
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  const routeMeta = getRouteMeta(location.pathname, nav);
  const navTitle = meta.navTitle || meta.title || routeMeta.title;
  const notificationCount = meta.notificationCount ?? 0;
  const isHome = location.pathname === nav?.home;
  const showBack = !isHome;

  const hasPasswordProvider = Boolean(
    user?.providerData?.some((p) => p.providerId === 'password')
  );

  const handleLogout = async () => {
    if (!window.confirm(t('Are you sure you want to logout?'))) return;
    try {
      await signOut(auth);
      navigate('/');
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = () => {
    const scrollToNotifications = () => {
      document.getElementById('notifications')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (nav.role === 'villager') {
      if (location.pathname === nav.home) {
        window.location.hash = 'notifications';
        return;
      }
      navigate('/dashboard/villager#notifications');
      return;
    }
    if (nav.role === 'doctor') {
      navigate('/doctor/notifications');
      return;
    }
    if (isHome) {
      scrollToNotifications();
      return;
    }
    navigate(nav?.home || '/');
    setTimeout(scrollToNotifications, 350);
  };

  const handleMobileAction = (item) => {
    if (item.action === 'scan') {
      onScanRequest?.();
      return;
    }
    if (item.to) {
      navigate(item.to);
      return;
    }
    const home = nav?.home || '/';
    if (item.hash) {
      navigate(`${home}#${item.hash}`);
      return;
    }
    navigate(home);
  };

  if (!nav) {
    return <div className="min-h-screen bg-app">{children}</div>;
  }

  const portalLabel = nav.portalLabel || `${nav.label} Portal`;
  const hideSidebar = Boolean(nav.hideSidebar);

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <FaHospitalAlt className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-tight text-fg">Rural Health</p>
          <p className="truncate text-xs text-muted-fg">{t(portalLabel)}</p>
        </div>
      </div>

      <nav className="sidebar-nav scrollbar-thin" aria-label="Main navigation">
        {nav.items.map((item) => {
          if (item.disabled) return null;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to + item.label}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn('sidebar-nav-link', isActive && 'sidebar-nav-link-active')}
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('sidebar-nav-icon', isActive && 'text-brand-400')} />
                  <span className="truncate">{t(item.label)}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-profile">
          <div className="topbar-avatar !h-9 !w-9 !text-[11px]">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{displayName}</p>
            <p className="truncate text-xs text-muted-fg">{t(nav.label)}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title={t('Logout')}
            aria-label={t('Logout')}
            className="sidebar-logout-btn"
          >
            <FaSignOutAlt className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-app">
      {!hideSidebar && (
        <aside
          className="fixed inset-y-0 left-0 z-40 hidden border-r border-default bg-sidebar lg:flex"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <SidebarContent />
        </aside>
      )}

      <AnimatePresence>
        {sidebarOpen && !hideSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -SIDEBAR_WIDTH - 16 }}
              animate={{ x: 0 }}
              exit={{ x: -SIDEBAR_WIDTH - 16 }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
              className="fixed inset-y-0 left-0 z-50 flex flex-col shadow-2xl lg:hidden"
              style={{ width: SIDEBAR_WIDTH }}
            >
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="absolute right-3 top-3 z-10 topbar-icon-btn"
                aria-label={t('Close')}
              >
                <FaTimes className="h-3.5 w-3.5" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={cn('flex min-h-screen flex-1 flex-col', !hideSidebar && 'lg:pl-[252px]')}>
        <DashboardChrome
          navTitle={navTitle}
          displayName={displayName}
          initials={initials}
          userEmail={user?.email}
          hasPasswordProvider={hasPasswordProvider}
          onLogout={handleLogout}
          logoutLabel={t('Logout')}
          changePasswordLabel={t('Change password')}
          notificationCount={notificationCount}
          darkMode={darkMode}
          onToggleTheme={toggleDarkMode}
          onOpenSidebar={() => setSidebarOpen(true)}
          onGoBack={() => navigate(-1)}
          onNotificationClick={handleNotificationClick}
          language={language}
          onLanguageChange={(e) => setLanguage(e.target.value)}
          showBack={showBack}
          navRole={nav.role}
          hideSidebar={hideSidebar}
          showSearch={!hideSidebar}
        />

        <main className={cn('dashboard-main', hideSidebar && 'dashboard-main--villager villager-shell')}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>

        {nav.mobileQuick && !hideSidebar && (
          <nav className="dashboard-mobile-nav lg:hidden" aria-label="Quick navigation">
            <div className="flex h-[3.25rem] items-center justify-around px-2">
              {nav.mobileQuick.map((item) => {
                const Icon = item.icon;
                const isScan = item.action === 'scan';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMobileAction(item)}
                    className={cn(
                      'flex flex-1 flex-col items-center justify-center gap-0.5 py-1',
                      !isScan && 'text-muted-fg active:text-brand-500'
                    )}
                  >
                    {isScan ? (
                      <>
                        <span className="-mt-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-glow">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-[10px] font-medium text-brand-500">{t(item.label)}</span>
                      </>
                    ) : (
                      <>
                        <Icon className="h-[17px] w-[17px]" />
                        <span className="text-[10px] font-medium">{t(item.label)}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {nav.fab && onScanRequest && (() => {
          const FabIcon = nav.fab.icon;
          return (
            <button
              type="button"
              onClick={onScanRequest}
              className="fixed bottom-7 right-6 z-40 hidden h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white shadow-glow transition hover:bg-brand-700 lg:flex"
            >
              <FabIcon className="h-4 w-4" />
              {t(nav.fab.label)}
            </button>
          );
        })()}
      </div>
    </div>
  );
}
