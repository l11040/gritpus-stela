import { Injectable, Logger } from '@nestjs/common';
import { ReplaySubject, Observable, map, finalize } from 'rxjs';

export interface ParseProgressEvent {
  step:
    | 'started'
    | 'analyzing'
    | 'agent_iteration'
    | 'agent_tool'
    | 'resolving_assignees'
    | 'summarizing'
    | 'completed'
    | 'failed';
  message: string;
  detail?: string;
  iteration?: number;
  maxIterations?: number;
  timestamp: number;
}

@Injectable()
export class MeetingProgressService {
  private readonly logger = new Logger(MeetingProgressService.name);
  private readonly subjects = new Map<string, ReplaySubject<ParseProgressEvent>>();

  private getOrCreateSubject(meetingId: string): ReplaySubject<ParseProgressEvent> {
    let subject = this.subjects.get(meetingId);
    if (!subject) {
      // Replay recent progress so refresh/reconnect clients can restore current stage immediately.
      subject = new ReplaySubject<ParseProgressEvent>(100);
      this.subjects.set(meetingId, subject);
    }
    return subject;
  }

  emit(meetingId: string, event: Omit<ParseProgressEvent, 'timestamp'>): void {
    const subject = this.getOrCreateSubject(meetingId);
    const fullEvent = { ...event, timestamp: Date.now() };
    this.logger.log(`[${meetingId}] ${event.step}: ${event.message}`);
    subject.next(fullEvent);
  }

  subscribe(meetingId: string): Observable<MessageEvent> {
    const subject = this.getOrCreateSubject(meetingId);

    return subject.asObservable().pipe(
      map(
        (event) =>
          ({ data: JSON.stringify(event) }) as MessageEvent,
      ),
      finalize(() => {
        this.logger.log(`[${meetingId}] SSE client disconnected`);
      }),
    );
  }

  start(meetingId: string): void {
    this.getOrCreateSubject(meetingId);
  }

  complete(meetingId: string): void {
    const subject = this.subjects.get(meetingId);
    if (subject) {
      setTimeout(() => {
        subject.complete();
        this.subjects.delete(meetingId);
      }, 1000);
    }
  }
}
