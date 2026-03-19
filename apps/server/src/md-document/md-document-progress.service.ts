import { Injectable, Logger } from '@nestjs/common';
import { ReplaySubject, Observable, map, finalize } from 'rxjs';

export interface MdDocumentProgressEvent {
  step: 'started' | 'analyzing' | 'summarizing' | 'completed' | 'failed';
  message: string;
  timestamp: number;
}

@Injectable()
export class MdDocumentProgressService {
  private readonly logger = new Logger(MdDocumentProgressService.name);
  private readonly subjects = new Map<string, ReplaySubject<MdDocumentProgressEvent>>();

  private getOrCreateSubject(documentId: string): ReplaySubject<MdDocumentProgressEvent> {
    let subject = this.subjects.get(documentId);
    if (!subject) {
      subject = new ReplaySubject<MdDocumentProgressEvent>(100);
      this.subjects.set(documentId, subject);
    }
    return subject;
  }

  emit(documentId: string, event: Omit<MdDocumentProgressEvent, 'timestamp'>): void {
    const subject = this.getOrCreateSubject(documentId);
    const fullEvent = { ...event, timestamp: Date.now() };
    this.logger.log(`[${documentId}] ${event.step}: ${event.message}`);
    subject.next(fullEvent);
  }

  subscribe(documentId: string): Observable<MessageEvent> {
    const subject = this.getOrCreateSubject(documentId);
    return subject.asObservable().pipe(
      map(
        (event) => ({ data: JSON.stringify(event) }) as MessageEvent,
      ),
      finalize(() => {
        this.logger.log(`[${documentId}] SSE client disconnected`);
      }),
    );
  }

  start(documentId: string): void {
    this.getOrCreateSubject(documentId);
  }

  complete(documentId: string): void {
    const subject = this.subjects.get(documentId);
    if (subject) {
      setTimeout(() => {
        subject.complete();
        this.subjects.delete(documentId);
      }, 1000);
    }
  }
}
