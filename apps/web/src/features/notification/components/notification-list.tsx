'use client';

import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Bell, Calendar, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationContext } from '../providers/notification-provider';
import type { Notification } from '../hooks/use-notifications';

interface NotificationListProps {
  notifications: Notification[];
  compact?: boolean;
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'card_assigned':
      return <Bell className="h-4 w-4" />;
    case 'card_due_soon':
      return <Calendar className="h-4 w-4" />;
    case 'meeting_parsed':
      return <FileText className="h-4 w-4" />;
  }
}

export function NotificationList({ notifications, compact = false }: NotificationListProps) {
  const { markAsRead } = useNotificationContext();

  const handleClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // 관련 엔티티로 이동
    if (notification.relatedEntityType === 'card' && notification.relatedEntityId) {
      // TODO: 카드 상세 페이지로 이동
      console.log('Navigate to card:', notification.relatedEntityId);
    } else if (notification.relatedEntityType === 'meeting' && notification.relatedEntityId) {
      // TODO: 회의록 상세 페이지로 이동
      console.log('Navigate to meeting:', notification.relatedEntityId);
    }
  };

  return (
    <div className={cn(compact ? 'space-y-0 divide-y' : 'space-y-1')}>
      {notifications.map((notification) => (
        <button
          key={notification.id}
          onClick={() => handleClick(notification)}
          className={cn(
            'group w-full text-left transition-colors',
            compact
              ? 'p-3 hover:bg-accent'
              : 'flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-muted/40',
            !notification.isRead && !compact && 'bg-blue-50/50 dark:bg-blue-950/20',
            !notification.isRead && compact && 'bg-blue-50/50 dark:bg-blue-950/20',
          )}
        >
          <div className="flex min-w-0 flex-1 gap-3">
            <div
              className={cn(
                'flex shrink-0 items-center justify-center rounded-full',
                compact ? 'h-8 w-8' : 'h-7 w-7',
                notification.type === 'card_assigned' &&
                  'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
                notification.type === 'card_due_soon' &&
                  'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400',
                notification.type === 'meeting_parsed' &&
                  'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
              )}
            >
              {getNotificationIcon(notification.type)}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    'truncate text-sm',
                    !notification.isRead ? 'font-medium' : 'text-muted-foreground',
                  )}
                >
                  {notification.title}
                </p>
                {!notification.isRead && (
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">{notification.message}</p>
              <p className="text-xs text-muted-foreground/70">
                {formatDistanceToNow(
                  typeof notification.createdAt === 'string'
                    ? new Date(notification.createdAt)
                    : notification.createdAt,
                  {
                    addSuffix: true,
                    locale: ko,
                  },
                )}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
