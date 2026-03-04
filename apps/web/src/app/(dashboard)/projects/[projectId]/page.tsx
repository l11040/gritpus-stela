'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Project {
  id: string;
  name: string;
  description: string;
  members: { id: string; role: string; user: { name: string; email: string } }[];
  boards: { id: string; name: string }[];
}

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);

  const load = useCallback(() => {
    fetcher<Project>({ url: `/projects/${projectId}`, method: 'GET' })
      .then(setProject)
      .catch(() => {});
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const createBoard = async () => {
    const name = prompt('보드 이름을 입력하세요');
    if (!name) return;
    await fetcher({ url: `/projects/${projectId}/boards`, method: 'POST', data: { name } });
    load();
  };

  if (!project) return <div className="text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{project.name}</h1>
        {project.description && (
          <p className="mt-1 text-muted-foreground">{project.description}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Link href={`/projects/${projectId}/meetings`}>
          <Button variant="outline">회의록</Button>
        </Link>
        <Link href={`/projects/${projectId}/documents`}>
          <Button variant="outline">문서</Button>
        </Link>
        <Link href={`/projects/${projectId}/settings`}>
          <Button variant="outline">설정</Button>
        </Link>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">보드</h2>
          <Button size="sm" onClick={createBoard}>+ 보드 추가</Button>
        </div>
        {project.boards?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              아직 보드가 없습니다.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {project.boards?.map((board) => (
              <Link key={board.id} href={`/projects/${projectId}/boards/${board.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base">{board.name}</CardTitle>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">멤버</h2>
        <div className="space-y-2">
          {project.members?.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-md border p-3">
              <div className="flex-1">
                <div className="font-medium">{m.user.name}</div>
                <div className="text-sm text-muted-foreground">{m.user.email}</div>
              </div>
              <Badge variant="secondary">{m.role}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
