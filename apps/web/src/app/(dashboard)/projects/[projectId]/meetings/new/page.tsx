'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50002';

export default function NewMeetingPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      if (rawContent) formData.append('rawContent', rawContent);
      if (file) formData.append('file', file);

      const token = localStorage.getItem('gst_access_token');
      const res = await fetch(`${BASE_URL}/projects/${projectId}/meetings`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error('업로드 실패');
      const meeting = await res.json();
      router.push(`/projects/${projectId}/meetings/${meeting.id}`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>새 회의록</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>제목</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="2024-03-04 주간 회의"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>회의록 내용 (직접 입력)</Label>
              <Textarea
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                placeholder="회의록 내용을 여기에 붙여넣으세요..."
                className="min-h-[200px]"
              />
            </div>
            <div className="space-y-2">
              <Label>또는 파일 업로드</Label>
              <Input
                type="file"
                accept=".txt,.md,.pdf,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '업로드 중...' : '회의록 등록'}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
