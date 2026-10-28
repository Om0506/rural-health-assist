import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FaBell, FaCheck } from 'react-icons/fa';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { notificationAPI } from '../../services/api';
import useDoctorPageMeta from './useDoctorPageMeta';
import { cn } from '../../utils/cn';

export default function DoctorNotifications() {
  const { userProfile } = useOutletContext();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [feedback, setFeedback] = useState('');

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useDoctorPageMeta({
    title: 'Notifications',
    subtitle: 'Escalations and follow-up alerts',
    notificationCount: unreadCount,
  });

  useEffect(() => {
    if (userProfile?.id) loadNotifications();
  }, [userProfile?.id]);

  const loadNotifications = async () => {
    try {
      const res = await notificationAPI.get(userProfile.id);
      setNotifications(res.data || []);
    } catch (e) {
      console.error(e);
      setNotifications([]);
    }
  };

  const markRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setFeedback('Marked as read.');
      setTimeout(() => setFeedback(''), 2000);
    } catch (e) {
      console.error(e);
      setFeedback(e?.response?.data?.error || 'Failed to mark as read.');
      setTimeout(() => setFeedback(''), 2500);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'escalation') return n.type === 'doctor_escalation';
    return true;
  });

  if (!userProfile) return <DashboardSkeleton />;

  return (
    <div className="page-container dashboard-stack">
      {feedback ? (
        <div className="rounded-xl border border-brand-500/25 bg-brand-500/10 px-4 py-3 text-sm text-brand-800 dark:text-brand-200">
          {feedback}
        </div>
      ) : null}
      <Card id="notifications">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaBell className="text-brand-500" />
            Notifications
          </CardTitle>
          {unreadCount > 0 && <Badge variant="danger">{unreadCount} unread</Badge>}
        </CardHeader>

        <div className="mb-4 flex flex-wrap gap-2">
          {['all', 'unread', 'escalation'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={filter === f ? 'filter-chip-active' : 'filter-chip'}
            >
              {f === 'escalation' ? 'Escalations' : f}
            </button>
          ))}
          {unreadCount > 0 && (
            <Button size="sm" className="ml-auto" onClick={() => navigate('/doctor/escalated')}>
              View escalated cases
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={FaBell} title="No notifications" description="Alerts will appear here." />
        ) : (
          <div className="max-h-[70vh] space-y-2.5 overflow-y-auto scrollbar-thin">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'notification-item',
                  !n.is_read && 'notification-item--unread'
                )}
              >
                <p className={cn('text-sm', n.is_read ? 'text-fg-secondary' : 'font-medium text-fg')}>
                  {n.title || 'Notification'}
                </p>
                <p className="mt-1 text-sm text-fg-secondary">{n.message}</p>
                <p className="mt-1 text-xs text-muted-fg">
                  {n.patient_name || '—'}
                  {n.village_name ? ` · ${n.village_name}` : ''}
                </p>
                <div className="mt-2 flex gap-2">
                  {!n.is_read && (
                    <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                      <FaCheck /> Read
                    </Button>
                  )}
                  {n.patient_id && (
                    <Button size="sm" onClick={() => navigate(`/patient/${n.patient_id}`)}>
                      Open patient
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
