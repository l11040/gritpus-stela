'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNotificationContext } from '@/features/notification/providers/notification-provider';
import { NotificationList } from '@/features/notification/components/notification-list';

export default function NotificationsPage() {
  const { notifications, fetchNotifications, markAllAsRead, loading } = useNotificationContext();

  useEffect(() => {
    fetchNotifications({ limit: 50 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4 px-6 pb-6 pt-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">알림</h1>
        {notifications.length > 0 && notifications.some((n) => !n.isRead) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="h-7 gap-1.5 text-xs text-muted-foreground"
          >
            모두 읽음 처리
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">로딩 중...</div>
      ) : notifications.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">알림이 없습니다</p>
        </div>
      ) : (
        <NotificationList notifications={notifications} />
      )}
    </div>
  );
}
