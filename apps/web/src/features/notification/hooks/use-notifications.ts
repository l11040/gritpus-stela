'use client';

import { useState, useCallback } from 'react';
import { fetcher } from '@/api/fetcher';

export interface Notification {
  id: string;
  userId: string;
  type: 'card_assigned' | 'card_due_soon' | 'meeting_parsed';
  title: string;
  message: string;
  relatedEntityType: 'card' | 'meeting' | 'project' | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  type?: 'card_assigned' | 'card_due_soon' | 'meeting_parsed';
  isRead?: boolean;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async (params?: NotificationQueryParams) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 20;

      queryParams.set('page', page.toString());
      queryParams.set('limit', limit.toString());
      if (params?.type) queryParams.set('type', params.type);
      if (params?.isRead !== undefined) queryParams.set('isRead', params.isRead.toString());

      const queryString = `?${queryParams.toString()}`;
      const response = await fetcher<NotificationListResponse>({
        url: `/notifications${queryString}`,
        method: 'GET',
      });
      setNotifications(response.notifications);
      return response;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetcher<{ count: number }>({
        url: '/notifications/unread-count',
        method: 'GET',
      });
      setUnreadCount(response.count);
      return response.count;
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      throw error;
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await fetcher({
        url: `/notifications/${notificationId}/read`,
        method: 'POST',
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await fetcher({
        url: '/notifications/read-all',
        method: 'POST',
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await fetcher({
        url: `/notifications/${notificationId}`,
        method: 'DELETE',
      });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }, []);

  const deleteAll = useCallback(async () => {
    try {
      await fetcher({
        url: '/notifications',
        method: 'DELETE',
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
      throw error;
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAll,
  };
}
