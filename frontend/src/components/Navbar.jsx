import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { FaBars, FaTimes, FaHospitalAlt } from 'react-icons/fa';
import { FiMoon, FiSun } from 'react-icons/fi';
import { useLanguage } from '../context/LanguageContext.jsx';
import { LANGUAGE_OPTIONS } from '../i18n/translations.js';
import { getDashboardPath } from '../utils/navigation';
import Button from './ui/Button';
import { cn } from '../utils/cn';
import { useTheme } from '../context/ThemeContext.jsx';

function Navbar({ user, userProfile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { darkMode, toggleDarkMode } = useTheme();
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const dashboardPath = getDashboardPath(userProfile);
  const displayName = userProfile?.fullName || user?.displayName || user?.email || 'User';
  const initials =
    (displayName || '')
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [user]);

  const navLinks = [
    { to: '/', label: t('Home') },
    { to: '/about', label: t('About') },
    { to: '/services', label: t('Services') },
    { to: '/contact', label: t('Contact') },
  ];

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled ? 'glass shadow-soft' : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16 sm:h-[72px]">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-teal-500 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <FaHospitalAlt className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white hidden sm:block">
              {t('Rural Healthcare')}
            </span>
            <span className="font-bold text-slate-900 sm:hidden">RHA</span>
          </Link>

          <div className="hidden md:flex items-center gap-1 rounded-2xl border border-white/60 bg-white/60 p-1 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/30">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'relative px-4 py-2 rounded-2xl text-sm font-semibold transition',
                    isActive
                      ? 'text-brand-700 dark:text-brand-200'
                      : 'text-slate-600 dark:text-slate-300 hover:text-brand-600'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="navActivePill"
                        className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-brand-600/15 to-teal-500/15 ring-1 ring-brand-500/15 dark:ring-brand-400/20"
                        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                      />
                    )}
                    {link.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-default bg-white/70 text-slate-700 shadow-soft transition hover:bg-white dark:bg-slate-900/40 dark:text-slate-200"
              aria-label={darkMode ? t('Switch to light mode') : t('Switch to dark mode')}
              title={darkMode ? t('Light mode') : t('Dark mode')}
            >
              {darkMode ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
            </button>

            {!user && (
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500/30"
                aria-label={t('Language')}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.nativeLabel || option.label}</option>
                ))}
              </select>
            )}

            {user ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  aria-label={t('My Profile')}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate hidden lg:block">
                    {displayName}
                  </span>
                </button>

                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute right-0 mt-2 w-64 card shadow-card p-4 space-y-3"
                    >
                      <div className="text-center pb-3 border-b border-slate-100">
                        <p className="text-xs text-slate-400 uppercase tracking-wider">{t('Welcome')}!</p>
                        <p className="font-semibold text-slate-900 truncate">{displayName}</p>
                      </div>
                      <Link
                        to={dashboardPath}
                        className="block w-full text-center py-2.5 rounded-xl bg-brand-50 text-brand-600 font-semibold text-sm hover:bg-brand-100"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        {t('Dashboard')}
                      </Link>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full input-field text-sm py-2"
                      >
                        {LANGUAGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.nativeLabel || option.label}</option>
                        ))}
                      </select>
                      <Button variant="danger" size="sm" className="w-full" onClick={handleLogout}>
                        {t('Logout')}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Button to="/login" variant="ghost" size="sm">{t('Login')}</Button>
                <Button to="/register" size="sm">{t('Get Started')}</Button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Menu"
          >
            {isOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden pb-4 space-y-2 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 px-1">
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-default bg-card px-3 py-2.5 text-sm font-semibold text-fg-secondary hover:bg-hover"
                >
                  {darkMode ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
                  {darkMode ? t('Light mode') : t('Dark mode')}
                </button>
              </div>
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'block px-4 py-3 rounded-xl font-semibold transition',
                    location.pathname === link.to ? 'nav-item-active' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full input-field text-sm"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.nativeLabel || option.label}</option>
                ))}
              </select>
              {user ? (
                <>
                  <Link to={dashboardPath} className="block btn-primary text-center" onClick={() => setIsOpen(false)}>
                    {t('Dashboard')}
                  </Link>
                  <button type="button" onClick={handleLogout} className="w-full btn-danger">
                    {t('Logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block btn-ghost text-center" onClick={() => setIsOpen(false)}>
                    {t('Login')}
                  </Link>
                  <Link to="/register" className="block btn-primary text-center" onClick={() => setIsOpen(false)}>
                    {t('Get Started')}
                  </Link>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

export default Navbar;
