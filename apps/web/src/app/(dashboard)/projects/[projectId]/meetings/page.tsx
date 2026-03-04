'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Meeting {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  createdBy: { name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  uploaded: '업로드됨',
  parsing: '파싱 중',
  parsed: '파싱 완료',
  confirmed: '확인 완료',
  failed: '실패',
};

export default function MeetingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    fetcher<Meeting[]>({ url: `/projects/${projectId}/meetings`, method: 'GET' })
      .then(setMeetings)
      .catch(() => {});
  }, [projectId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">회의록</h1>
        <Link href={`/projects/${projectId}/meetings/new`}>
          <Button>새 회의록</Button>
        </Link>
      </div>

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            아직 회의록이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <Link key={m.id} href={`/projects/${projectId}/meetings/${m.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <CardTitle className="text-base">{m.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{STATUS_LABELS[m.status] || m.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
