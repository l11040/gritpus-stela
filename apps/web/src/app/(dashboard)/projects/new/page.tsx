'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const project = await fetcher<{ id: string }>({
        url: '/projects',
        method: 'POST',
        data: { name, description },
      });
      router.push(`/projects/${project.id}`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="text-sm text-muted-foreground">
        <Link href="/dashboard" className="transition-colors hover:text-foreground">
          대시보드
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">새 프로젝트</span>
      </div>

      <h1 className="text-lg font-semibold">새 프로젝트</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm">프로젝트 이름</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="주간 회의 프로젝트"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">설명</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="프로젝트에 대한 설명 (선택)"
            rows={3}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? '생성 중...' : '프로젝트 생성'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}
