import { useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';
import { FaBell, FaCheck } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';
import { CardTitle } from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';

function NotificationPanel({ userId, onUnreadCountChange }) {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  const loadNotifications = async () => {
    try {
      const response = await notificationAPI.get(userId);
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationAPI.markRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (loading) {
    return <div className="card text-muted-fg text-sm">{t('Loading notifications...')}</div>;
  }

  return (
    <div id="notifications" className="card scroll-mt-16">
      <div className="mb-4 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <FaBell className="text-brand-500" />
          {t('Notifications')}
        </CardTitle>
        {unreadCount > 0 && <Badge variant="danger">{unreadCount} {t('new')}</Badge>}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={FaBell} title={t('No notifications yet')} />
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto scrollbar-thin">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-xl border p-3.5 transition ${
                notification.is_read
                  ? 'border-default bg-elevated/50'
                  : 'border-brand-500/20 bg-brand-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${notification.is_read ? 'text-fg-secondary' : 'font-medium text-fg'}`}>
                    {notification.message || notification.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-fg">
                    {new Date(notification.created_at || notification.date).toLocaleString()}
                  </p>
                </div>
                {!notification.is_read && (
                  <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)} aria-label={t('Mark as read')}>
                    <FaCheck className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationPanel;
