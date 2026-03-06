import { Injectable, Logger } from '@nestjs/common';
import { ReplaySubject, Observable, map, finalize } from 'rxjs';
import { NotificationResponseDto } from './notification.dto';

export interface NotificationEvent {
  notification: NotificationResponseDto;
  timestamp: number;
}

@Injectable()
export class NotificationStreamService {
  private readonly logger = new Logger(NotificationStreamService.name);
  private readonly subjects = new Map<string, ReplaySubject<NotificationEvent>>();

  private getOrCreateSubject(userId: string): ReplaySubject<NotificationEvent> {
    let subject = this.subjects.get(userId);
    if (!subject) {
      // 재연결 시 최근 10개 알림 복구
      subject = new ReplaySubject<NotificationEvent>(10);
      this.subjects.set(userId, subject);
    }
    return subject;
  }

  emit(userId: string, notification: NotificationResponseDto): void {
    const subject = this.getOrCreateSubject(userId);
    const event: NotificationEvent = {
      notification,
      timestamp: Date.now(),
    };
    this.logger.log(`[User ${userId}] New notification: ${notification.type}`);
    subject.next(event);
  }

  subscribe(userId: string): Observable<MessageEvent> {
    const subject = this.getOrCreateSubject(userId);

    return subject.asObservable().pipe(
      map(
        (event) =>
          ({ data: JSON.stringify(event) }) as MessageEvent,
      ),
      finalize(() => {
        this.logger.log(`[User ${userId}] SSE client disconnected`);
      }),
    );
  }

  // 메모리 관리: 장시간 연결 없는 경우 정리 (선택적)
  cleanup(userId: string): void {
    const subject = this.subjects.get(userId);
    if (subject) {
      subject.complete();
      this.subjects.delete(userId);
      this.logger.log(`[User ${userId}] Stream cleaned up`);
    }
  }
}
