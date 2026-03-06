'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useNotifications } from '../hooks/use-notifications';
import { useNotificationStream } from '../hooks/use-notification-stream';

interface NotificationContextValue {
  notifications: ReturnType<typeof useNotifications>['notifications'];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: ReturnType<typeof useNotifications>['fetchNotifications'];
  fetchUnreadCount: ReturnType<typeof useNotifications>['fetchUnreadCount'];
  markAsRead: ReturnType<typeof useNotifications>['markAsRead'];
  markAllAsRead: ReturnType<typeof useNotifications>['markAllAsRead'];
  deleteNotification: ReturnType<typeof useNotifications>['deleteNotification'];
  deleteAll: ReturnType<typeof useNotifications>['deleteAll'];
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const notificationApi = useNotifications();
  const { onNewNotification } = useNotificationStream();

  // SSE로 새 알림 수신 시 목록 새로고침
  useEffect(() => {
    onNewNotification(() => {
      notificationApi.fetchUnreadCount();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNewNotification]);

  // 초기 데이터 로드
  useEffect(() => {
    notificationApi.fetchUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <NotificationContext.Provider value={notificationApi}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}
