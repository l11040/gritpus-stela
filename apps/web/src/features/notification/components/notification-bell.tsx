'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotificationContext } from '../providers/notification-provider';
import { NotificationList } from './notification-list';
import { useEffect, useState } from 'react';

export function NotificationBell() {
  const { unreadCount, fetchNotifications, markAllAsRead, notifications } = useNotificationContext();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchNotifications({ limit: 5 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2.5">
          <h3 className="text-sm font-semibold">알림</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-6 px-2 text-xs text-muted-foreground"
            >
              모두 읽음
            </Button>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto border-y">
          {notifications.length > 0 ? (
            <NotificationList notifications={notifications.slice(0, 5)} compact />
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">알림이 없습니다</div>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="p-1.5">
            <a
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              모든 알림 보기
            </a>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
