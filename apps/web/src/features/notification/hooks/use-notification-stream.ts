'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50002';

export interface NotificationEvent {
  notification: {
    id: string;
    userId: string;
    type: 'card_assigned' | 'card_due_soon' | 'meeting_parsed';
    title: string;
    message: string;
    relatedEntityType: 'card' | 'meeting' | 'project' | null;
    relatedEntityId: string | null;
    isRead: boolean;
    createdAt: Date;
  };
  timestamp: number;
}

export function useNotificationStream() {
  const [latestNotification, setLatestNotification] = useState<NotificationEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onNewNotificationRef = useRef<((notification: NotificationEvent) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connectSSE = useCallback(() => {
    cleanup();

    const url = `${API_BASE}/notifications/stream`;
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: NotificationEvent = JSON.parse(event.data);
        setLatestNotification(data);
        onNewNotificationRef.current?.(data);
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // SSE connection lost — try to reconnect after a short delay
      es.close();
      eventSourceRef.current = null;

      setTimeout(() => {
        connectSSE();
      }, 3000);
    };
  }, [cleanup]);

  useEffect(() => {
    connectSSE();
    return cleanup;
  }, [connectSSE, cleanup]);

  const onNewNotification = useCallback((cb: (notification: NotificationEvent) => void) => {
    onNewNotificationRef.current = cb;
  }, []);

  return {
    latestNotification,
    onNewNotification,
  };
}
