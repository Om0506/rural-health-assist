import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { FaBars, FaTimes, FaHospitalAlt } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';
import { LANGUAGE_OPTIONS } from '../i18n/translations.js';
import { getDashboardPath } from '../utils/navigation';

function Navbar({ user, userProfile }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const profileMenuRef = useRef(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const dashboardPath = getDashboardPath(userProfile);
  const displayName =
    userProfile?.fullName ||
    user?.displayName ||
    user?.email ||
    'User';
  const initials =
    (displayName || '')
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toLocaleUpperCase('en-US') || 'U';

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

  return (
    <nav className="bg-primary text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center space-x-2 text-xl font-bold">
            <FaHospitalAlt className="text-2xl" />
            <span className="hidden sm:inline">{t('Rural Healthcare')}</span>
            <span className="sm:hidden">RHA</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="hover:text-green-200 transition">{t('Home')}</Link>
            <Link to="/about" className="hover:text-green-200 transition">{t('About')}</Link>
            <Link to="/services" className="hover:text-green-200 transition">{t('Services')}</Link>
            <Link to="/contact" className="hover:text-green-200 transition">{t('Contact')}</Link>

            {!user && (
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-white text-primary text-sm px-2 py-1 rounded-md focus:outline-none"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {user ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  className="flex items-center bg-white/10 hover:bg-white/20 transition rounded-full p-1 focus:outline-none"
                  aria-label={t('My Profile')}
                >
                  <div className="w-10 h-10 rounded-full bg-white text-primary font-bold flex items-center justify-center shadow-inner">
                    {initials}
                  </div>
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white text-gray-800 rounded-2xl shadow-2xl p-5 space-y-4">
                    <div className="text-center space-y-1">
                      <p className="text-xs uppercase text-gray-400 tracking-wider">
                        {t('Welcome')}!
                      </p>
                      <p className="text-lg font-semibold text-gray-900 truncate">{displayName}</p>
                    </div>

                    <Link
                      to={dashboardPath}
                      className="block w-full bg-primary/10 text-primary font-semibold px-4 py-2 rounded-lg hover:bg-primary/20 transition text-center"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      {t('Dashboard')}
                    </Link>

                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">{t('Language')}</p>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        {LANGUAGE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-semibold"
                    >
                      {t('Logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-white text-primary px-4 py-2 rounded-lg hover:bg-green-100 transition font-semibold"
              >
                {t('Login')}
              </Link>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-2xl focus:outline-none"
          >
            {isOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4 space-y-3">
            {user && (
              <div className="flex items-center justify-end bg-white/10 rounded-xl px-4 py-3">
                <div className="w-12 h-12 rounded-full bg-white text-primary font-bold flex items-center justify-center">
                  {initials}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">{t('Language')}</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-white text-primary text-sm px-2 py-1 rounded-md focus:outline-none"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <Link
              to="/"
              className="block hover:text-green-200 transition"
              onClick={() => setIsOpen(false)}
            >
              {t('Home')}
            </Link>
            <Link
              to="/about"
              className="block hover:text-green-200 transition"
              onClick={() => setIsOpen(false)}
            >
              {t('About')}
            </Link>
            <Link
              to="/services"
              className="block hover:text-green-200 transition"
              onClick={() => setIsOpen(false)}
            >
              {t('Services')}
            </Link>
            <Link
              to="/contact"
              className="block hover:text-green-200 transition"
              onClick={() => setIsOpen(false)}
            >
              {t('Contact')}
            </Link>
            
            {user ? (
              <>
                <button
                  onClick={() => {
                    navigate(dashboardPath);
                    setIsOpen(false);
                  }}
                  className="block w-full text-left hover:text-green-200 transition font-semibold"
                >
                  {t('Dashboard')}
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="w-full bg-white text-primary px-4 py-2 rounded-lg hover:bg-green-100 transition font-semibold text-left"
                >
                  {t('Logout')}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="block bg-white text-primary px-4 py-2 rounded-lg hover:bg-green-100 transition font-semibold text-center"
                onClick={() => setIsOpen(false)}
              >
                {t('Login')}
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
