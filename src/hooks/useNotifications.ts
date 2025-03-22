import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../lib/notifications';
import type { Notification } from '../types';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const requestPermission = useCallback(async () => {
    try {
      const granted = await notificationService.requestPermission();
      setPermission(granted ? 'granted' : 'denied');
      return granted;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to request permission'));
      return false;
    }
  }, []);

  const showNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    try {
      await notificationService.showNotification(title, options);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to show notification'));
    }
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        // Fetch notifications from API
        // const response = await api.get('/notifications');
        // setNotifications(response.data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
      } finally {
        setLoading(false);
      }
    };

    if (permission === 'granted') {
      fetchNotifications();
    }
  }, [permission]);

  return {
    permission,
    notifications,
    loading,
    error,
    requestPermission,
    showNotification,
  };
}