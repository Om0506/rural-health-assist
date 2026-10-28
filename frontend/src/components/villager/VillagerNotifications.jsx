import { useEffect, useState } from 'react';
import {
  FaBell,
  FaCalendarCheck,
  FaCheck,
  FaClinicMedical,
  FaFlask,
  FaPills,
} from 'react-icons/fa';
import { notificationAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import VillagerSectionHeader from './VillagerSectionHeader';
import VillagerFilterTabs from './VillagerFilterTabs';
import EmptyState from '../ui/EmptyState';
import FeedbackBanner from '../ui/FeedbackBanner';
import { getApiErrorMessage } from '../../utils/apiError';

function getNotificationIcon(message = '') {
  const m = message.toLowerCase();
  if (m.includes('medicine') || m.includes('pill')) return FaPills;
  if (m.includes('camp') || m.includes('appointment')) return FaCalendarCheck;
  if (m.includes('lab') || m.includes('report')) return FaFlask;
  if (m.includes('doctor') || m.includes('visit')) return FaClinicMedical;
  return FaBell;
}

export default function VillagerNotifications({ userId, onUnreadCountChange }) {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [feedback, setFeedback] = useState({ message: '', variant: 'info' });

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  const loadNotifications = async () => {
    try {
      const res = await notificationAPI.get(userId);
      setNotifications(res.data || []);
    } catch (e) {
      console.error(e);
      setFeedback({ message: getApiErrorMessage(e, t('Failed to load notifications.')), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setFeedback({ message: t('Marked as read.'), variant: 'success' });
    } catch (e) {
      console.error(e);
      setFeedback({ message: getApiErrorMessage(e, t('Failed to mark notification as read.')), variant: 'error' });
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  });

  const filterTabs = [
    { id: 'all', label: t('All') },
    { id: 'unread', label: `${t('Unread')}${unreadCount ? ` (${unreadCount})` : ''}`, count: unreadCount },
    { id: 'read', label: t('Read') },
  ];

  if (loading) {
    return (
      <div className="villager-screen">
        <VillagerSectionHeader title={t('Notifications')} subtitle={t('Stay updated on your health')} />
        <p className="py-12 text-center text-sm text-muted-fg animate-pulse">{t('Loading notifications...')}</p>
      </div>
    );
  }

  return (
    <div className="villager-screen">
      <VillagerSectionHeader title={t('Notifications')} subtitle={t('Stay updated on your health')} />

      <FeedbackBanner message={feedback.message} variant={feedback.variant} className="mb-4" />

      <VillagerFilterTabs tabs={filterTabs} active={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <EmptyState icon={FaBell} title={t('No notifications yet')} />
      ) : (
        <div className="villager-notif-list">
          {filtered.map((n) => {
            const Icon = getNotificationIcon(n.message || n.title || '');
            const text = n.message || n.title || '';
            return (
              <article
                key={n.id}
                className={`villager-notif-card ${!n.is_read ? 'villager-notif-card--unread' : ''}`}
              >
                <div className="villager-notif-icon">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="villager-notif-title">{text.split('.')[0] || text}</p>
                  <p className="villager-notif-msg line-clamp-2">{text}</p>
                  <p className="villager-notif-time">
                    {new Date(n.created_at || n.date).toLocaleString()}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => markAsRead(n.id)}
                    className="villager-notif-read"
                    aria-label={t('Mark as read')}
                  >
                    <FaCheck className="h-3.5 w-3.5" />
                  </button>
                )}
                {!n.is_read && <span className="villager-notif-dot" />}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
