'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichEditor } from '@/components/common/rich-editor';
import { Upload } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50002';

export default function NewMeetingPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="max-w-2xl space-y-4">
      <h2 className="text-base font-semibold">새 회의록</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm">제목</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="2024-03-04 주간 회의"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">회의록 내용 (직접 입력)</Label>
          <RichEditor
            defaultValue=""
            onChange={setRawContent}
            placeholder="회의록 내용을 여기에 붙여넣으세요..."
            className="min-h-50"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">또는 파일 업로드</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground transition-colors hover:bg-muted/40"
          >
            <Upload className="size-4" />
            {file ? file.name : '클릭하여 파일 선택 (.txt, .md, .pdf, .docx)'}
          </button>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? '업로드 중...' : '회의록 등록'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}
