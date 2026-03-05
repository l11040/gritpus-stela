'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RichEditor } from '@/components/common/rich-editor';

interface Meeting {
  id: string;
  title: string;
  rawContent: string;
  status: string;
  meetingSummary: string | null;
  parsedActionItems: { title: string; description?: string; priority?: string; assigneeName?: string; dueDate?: string }[] | null;
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
  const [parsing, setParsing] = useState(false);
  const [rawExpanded, setRawExpanded] = useState(false);

  const load = () => {
    fetcher<Meeting>({ url: `/projects/${projectId}/meetings/${meetingId}`, method: 'GET' })
      .then(setMeeting)
      .catch(() => {});
  };

  useEffect(() => { load(); }, [projectId, meetingId]);

  const handleParse = async () => {
    setParsing(true);
    try {
      await fetcher({ url: `/projects/${projectId}/meetings/${meetingId}/parse`, method: 'POST' });
      load();
    } catch {
    } finally {
      setParsing(false);
    }
  };

  if (!meeting) return null;

  return (
    <div className="max-w-3xl space-y-6">
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

      {/* Parse button / Failed */}
      {meeting.status === 'uploaded' && (
        <div className="flex items-center gap-2">
          <Button
            onClick={handleParse}
            disabled={parsing}
            variant="outline"
            size="sm"
            className="h-8 text-xs"
          >
            {parsing ? 'AI 파싱 중... (최대 3분 소요)' : 'AI로 액션 아이템 추출'}
          </Button>
        </div>
      )}
      {meeting.status === 'failed' && (
        <div className="space-y-2">
          <div className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            AI 파싱에 실패했습니다.
          </div>
          <Button onClick={handleParse} disabled={parsing} variant="outline" size="sm">
            다시 시도
          </Button>
        </div>
      )}

      {/* 회의 요약 */}
      {(meeting.status === 'parsed' || meeting.status === 'confirmed') && meeting.meetingSummary && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">회의 요약</h3>
          <div className="rounded-md border px-4 py-3">
            <p className="text-sm leading-relaxed">{meeting.meetingSummary}</p>
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
                  {item.assigneeName && <span>담당: {item.assigneeName}</span>}
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
