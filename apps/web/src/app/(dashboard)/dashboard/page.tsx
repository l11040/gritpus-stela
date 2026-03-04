'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  members: { id: string; role: string; user: { name: string } }[];
  boards: { id: string; name: string }[];
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetcher<Project[]>({ url: '/projects', method: 'GET' })
      .then(setProjects)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <Link href="/projects/new">
          <Button>새 프로젝트</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            아직 프로젝트가 없습니다. 새 프로젝트를 만들어보세요.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="truncate">{project.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {project.description || '설명 없음'}
                  </p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>멤버 {project.members?.length || 0}명</span>
                    <span>보드 {project.boards?.length || 0}개</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
