import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaKey, FaSignOutAlt } from 'react-icons/fa';
import { cn } from '../../utils/cn';
import ChangePasswordModal from './ChangePasswordModal';

export default function TopbarUserMenu({
  initials,
  displayName,
  userEmail,
  hasPasswordProvider,
  onLogout,
  logoutLabel = 'Logout',
  changePasswordLabel = 'Change password',
}) {
  const [open, setOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleChangePassword = () => {
    setOpen(false);
    setShowPasswordModal(true);
  };

  const handleLogout = () => {
    setOpen(false);
    onLogout();
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn('topbar-avatar', open && 'ring-2 ring-brand-500/40')}
          aria-label="Account menu"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {initials}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="topbar-user-menu"
              role="menu"
            >
              <div className="border-b border-default px-3 py-2.5">
                <p className="truncate text-sm font-medium text-fg">{displayName}</p>
                {userEmail && <p className="truncate text-xs text-muted-fg">{userEmail}</p>}
              </div>
              <button type="button" role="menuitem" className="topbar-user-menu-item" onClick={handleChangePassword}>
                <FaKey className="h-3.5 w-3.5 shrink-0 opacity-70" />
                {changePasswordLabel}
              </button>
              <button
                type="button"
                role="menuitem"
                className="topbar-user-menu-item topbar-user-menu-item-danger"
                onClick={handleLogout}
              >
                <FaSignOutAlt className="h-3.5 w-3.5 shrink-0" />
                {logoutLabel}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        userEmail={userEmail}
        hasPasswordProvider={hasPasswordProvider}
      />
    </>
  );
}
