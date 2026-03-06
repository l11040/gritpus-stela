'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RichEditor } from '@/components/common/rich-editor';
import { useParseProgressContext } from '@/features/meeting/providers/parse-progress-provider';

interface Meeting {
  id: string;
  title: string;
  rawContent: string;
  status: string;
  meetingSummary: string | null;
  parsedActionItems: {
    title: string;
    description?: string;
    priority?: string;
    assigneeName?: string;
    assigneeNames?: string[];
    dueDate?: string;
  }[] | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  uploaded: '업로드됨',
  parsing: '파싱 중',
  parsed: '파싱 완료',
  confirmed: '확인 완료',
  failed: '실패',
};

export default function MeetingDetailPage() {
  const { projectId, meetingId } = useParams<{ projectId: string; meetingId: string }>();
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [rawExpanded, setRawExpanded] = useState(false);
  const { startParsing, isParsing, onComplete } = useParseProgressContext();

  const load = useCallback(() => {
    fetcher<Meeting>({ url: `/projects/${projectId}/meetings/${meetingId}`, method: 'GET' })
      .then(setMeeting)
      .catch(() => {});
  }, [projectId, meetingId]);

  useEffect(() => { load(); }, [load]);

  // Reload meeting data when parsing completes
  useEffect(() => {
    onComplete((completedMeetingId) => {
      if (completedMeetingId === meetingId) {
        load();
      }
    });
  }, [meetingId, load, onComplete]);

  const handleParse = async () => {
    if (!meeting) return;
    await startParsing(projectId, meetingId, meeting.title);
    // Update local status immediately
    setMeeting((prev) => prev ? { ...prev, status: 'parsing' } : prev);
  };

  if (!meeting) return null;

  const canRunInitialParse =
    meeting.status === 'uploaded' || meeting.status === 'failed';
  const canReparse =
    meeting.status === 'parsed' || meeting.status === 'confirmed';
  const initialParseButtonLabel =
    meeting.status === 'failed' ? '다시 시도' : 'AI로 액션 아이템 추출';

  return (
    <div className="space-y-6 px-6 pt-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{meeting.title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date(meeting.createdAt).toLocaleDateString('ko-KR')}
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {STATUS_LABELS[meeting.status] || meeting.status}
        </Badge>
      </div>

      {meeting.status === 'parsing' && (
        <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          AI 파싱 중입니다. 최대 3분 정도 소요될 수 있습니다.
        </div>
      )}

      {/* Parse action */}
      {canRunInitialParse && (
        <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              회의록을 분석해 액션 아이템을 추출합니다.
            </p>
            <Button
              onClick={handleParse}
              disabled={isParsing}
              variant="outline"
              size="sm"
              className="h-8 text-xs"
            >
              {isParsing ? 'AI 파싱 중...' : initialParseButtonLabel}
            </Button>
          </div>
        </div>
      )}

      {meeting.status === 'failed' && (
        <div className="space-y-2">
          <div className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            AI 파싱에 실패했습니다.
          </div>
        </div>
      )}

      {/* 회의 요약 */}
      {(meeting.status === 'parsed' || meeting.status === 'confirmed') && meeting.meetingSummary && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">회의 요약</h3>
          <div className="rounded-md border px-4 py-3">
            <RichEditor
              key={`summary-${meeting.id}`}
              defaultValue={meeting.meetingSummary}
              editable={false}
              inputFormat="markdown"
              className="text-sm leading-relaxed"
            />
          </div>
        </section>
      )}

      {/* 추출된 액션 아이템 */}
      {(meeting.status === 'parsed' || meeting.status === 'confirmed') && meeting.parsedActionItems && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              추출된 액션 아이템 ({meeting.parsedActionItems.length}개)
            </h3>
            <div className="flex items-center gap-1">
              {canReparse && (
                <Button
                  onClick={handleParse}
                  disabled={isParsing}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                >
                  {isParsing ? '다시 파싱 중...' : '다시 파싱'}
                </Button>
              )}
              {meeting.status === 'parsed' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => router.push(`/projects/${projectId}/meetings/${meetingId}/preview`)}
                >
                  미리보기 및 등록
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            {meeting.parsedActionItems.map((item, i) => (
              <div
                key={i}
                className="rounded-md px-3 py-2.5 transition-colors hover:bg-muted/40"
              >
                <div className="text-sm font-medium">{item.title}</div>
                {item.description && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{item.description}</div>
                )}
                <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {item.priority && (
                    <Badge variant="outline" className="h-4 px-1 text-[10px] leading-none">
                      {item.priority}
                    </Badge>
                  )}
                  {(item.assigneeNames?.length || item.assigneeName) && (
                    <span>
                      담당: {item.assigneeNames?.length ? item.assigneeNames.join(', ') : item.assigneeName}
                    </span>
                  )}
                  {item.dueDate && <span>기한: {item.dueDate}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 원문: 접기/펼치기 */}
      <section>
        <div className="rounded-md border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between rounded-b-none rounded-t-md px-4 py-3 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          onClick={() => setRawExpanded((v) => !v)}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <FileText className="size-4" />
            원문
          </span>
          {rawExpanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </Button>
        {rawExpanded && (
          <div className="max-h-[50vh] overflow-y-auto border-t">
            <div className="p-3">
              <RichEditor
                key={meeting.id}
                defaultValue={meeting.rawContent}
                editable={false}
              />
            </div>
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
