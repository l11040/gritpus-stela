'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Meeting {
  id: string;
  title: string;
  rawContent: string;
  status: string;
  meetingSummary: string | null;
  parsedActionItems: { title: string; description?: string; priority?: string; assigneeName?: string; dueDate?: string }[] | null;
  createdAt: string;
}

export default function MeetingDetailPage() {
  const { projectId, meetingId } = useParams<{ projectId: string; meetingId: string }>();
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [parsing, setParsing] = useState(false);

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

  if (!meeting) return <div className="text-muted-foreground">로딩 중...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{meeting.title}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(meeting.createdAt).toLocaleDateString('ko-KR')}
          </p>
        </div>
        <Badge variant="secondary">{meeting.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">원문</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm">{meeting.rawContent}</pre>
        </CardContent>
      </Card>

      {meeting.status === 'uploaded' && (
        <Button onClick={handleParse} disabled={parsing} className="w-full">
          {parsing ? 'AI 파싱 중... (최대 3분 소요)' : 'AI로 액션 아이템 추출'}
        </Button>
      )}

      {meeting.status === 'failed' && (
        <div className="space-y-2">
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            AI 파싱에 실패했습니다.
          </div>
          <Button onClick={handleParse} disabled={parsing} variant="outline">
            다시 시도
          </Button>
        </div>
      )}

      {(meeting.status === 'parsed' || meeting.status === 'confirmed') && meeting.parsedActionItems && (
        <>
          {meeting.meetingSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">회의 요약</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{meeting.meetingSummary}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                추출된 액션 아이템 ({meeting.parsedActionItems.length}개)
              </CardTitle>
              {meeting.status === 'parsed' && (
                <Button
                  size="sm"
                  onClick={() => router.push(`/projects/${projectId}/meetings/${meetingId}/preview`)}
                >
                  미리보기 및 등록
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {meeting.parsedActionItems.map((item, i) => (
                <div key={i}>
                  {i > 0 && <Separator className="mb-3" />}
                  <div className="space-y-1">
                    <div className="font-medium">{item.title}</div>
                    {item.description && (
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    )}
                    <div className="flex gap-2 text-xs">
                      {item.priority && <Badge variant="outline">{item.priority}</Badge>}
                      {item.assigneeName && <span>담당: {item.assigneeName}</span>}
                      {item.dueDate && <span>기한: {item.dueDate}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
