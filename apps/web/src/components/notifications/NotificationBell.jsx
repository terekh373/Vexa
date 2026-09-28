import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@vexa/shared';

import styles from './NotificationBell.module.css';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationsService.js';

const REFRESH_INTERVAL_MS = 60_000;

const formatDate = (value) => {
  if (!value) return '';

  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const notificationHref = (notification) => {
  const payload = notification?.payload;

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    if (typeof payload.href === 'string' && payload.href.startsWith('/')) {
      return payload.href;
    }

    if (notification.type === 'MODERATION' && typeof payload.courseId === 'string') {
      return routes.authorCourseEdit(payload.courseId);
    }

    if (notification.type === 'PURCHASE' && typeof payload.orderId === 'string') {
      return routes.orders();
    }
  }

  if (notification.type === 'REVIEW') return routes.authorReviews();
  if (notification.type === 'PAYOUT') return routes.authorBalance();

  return null;
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);

    try {
      const data = await getNotifications({ page: 1, limit: 10 });
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(Number(data.unreadCount) || 0);
      setError('');
    } catch {
      if (!silent) setError('Не вдалося завантажити сповіщення');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications({ silent: true });

    const interval = window.setInterval(() => {
      void loadNotifications({ silent: true });
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  const toggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) void loadNotifications();
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.readAt) {
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));

      try {
        await markNotificationRead(notification.id);
      } catch {
        void loadNotifications({ silent: true });
      }
    }

    const href = notificationHref(notification);
    setIsOpen(false);
    if (href) navigate(href);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    const now = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
    } catch {
      void loadNotifications({ silent: true });
    }
  };

  const visibleCount = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.bellButton}
        onClick={toggle}
        aria-label={unreadCount > 0 ? `Сповіщення: ${unreadCount} непрочитаних` : 'Сповіщення'}
        aria-expanded={isOpen}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && <span className={styles.badge}>{visibleCount}</span>}
      </button>

      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <strong>Сповіщення</strong>
            <button
              type="button"
              className={styles.markAllButton}
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              Прочитати всі
            </button>
          </div>

          {isLoading && <p className={styles.state}>Завантаження...</p>}
          {!isLoading && error && <p className={styles.error}>{error}</p>}
          {!isLoading && !error && items.length === 0 && (
            <p className={styles.state}>Нових сповіщень немає</p>
          )}

          {!isLoading && !error && items.length > 0 && (
            <div className={styles.list}>
              {items.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  className={`${styles.item} ${notification.readAt ? '' : styles.unread}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className={styles.itemTitle}>{notification.title}</span>
                  {notification.body && <span className={styles.itemBody}>{notification.body}</span>}
                  <span className={styles.itemDate}>{formatDate(notification.createdAt)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
