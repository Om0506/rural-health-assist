import { useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';
import { FaBell, FaCheck } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext.jsx';

function NotificationPanel({ userId }) {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const loadNotifications = async () => {
    try {
      const response = await notificationAPI.get(userId);
      setNotifications(response.data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationAPI.markRead(notificationId);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return <div className="card">{t('Loading notifications...')}</div>;
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
          <FaBell className="text-accent" />
          <span>{t('Notifications')}</span>
        </h3>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            {unreadCount} {t('new')}
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-gray-500 text-center py-8">{t('No notifications yet')}</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border transition ${
                notification.is_read
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className={`${notification.is_read ? 'text-gray-600' : 'text-gray-800 font-semibold'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.date).toLocaleString()}
                  </p>
                </div>
                {!notification.is_read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="ml-2 text-primary hover:text-green-600"
                    title={t('Mark as read')}
                  >
                    <FaCheck />
                  </button>
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
