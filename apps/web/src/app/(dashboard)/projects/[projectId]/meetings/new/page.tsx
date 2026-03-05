'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichEditor } from '@/components/common/rich-editor';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50002';
const MAX_UPLOAD_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const MAX_UPLOAD_FILE_SIZE_MB = Math.floor(MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024));

export default function NewMeetingPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = e.target.files?.[0] || null;
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (nextFile.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      toast.error(`파일 용량은 최대 ${MAX_UPLOAD_FILE_SIZE_MB}MB까지 업로드할 수 있습니다.`);
      e.target.value = '';
      setFile(null);
      return;
    }
    setFile(nextFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (file && file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      toast.error(`파일 용량은 최대 ${MAX_UPLOAD_FILE_SIZE_MB}MB까지 업로드할 수 있습니다.`);
      return;
    }
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      if (rawContent) formData.append('rawContent', rawContent);
      if (file) formData.append('file', file);

      const res = await fetch(`${BASE_URL}/projects/${projectId}/meetings`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '회의록 업로드에 실패했습니다.');
      }
      const meeting = await res.json();
      router.push(`/projects/${projectId}/meetings/${meeting.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '회의록 업로드에 실패했습니다.');
    } finally {
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
            onChange={handleFileChange}
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
