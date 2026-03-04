'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>새 프로젝트</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>프로젝트 이름</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="주간 회의 프로젝트"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="프로젝트에 대한 설명 (선택)"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '생성 중...' : '프로젝트 생성'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
