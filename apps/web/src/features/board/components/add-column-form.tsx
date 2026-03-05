'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

interface AddColumnFormProps {
  onAdd: (name: string) => Promise<void>;
}

export function AddColumnForm({ onAdd }: AddColumnFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    try {
      await onAdd(trimmed);
      setName('');
      setIsAdding(false);
    } catch {
      // 실패 시 입력 상태 유지
    } finally {
      setLoading(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        type="button"
        className="flex h-10 w-68 shrink-0 items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        onClick={() => setIsAdding(true)}
      >
        <Plus className="size-3.5" />
        컬럼 추가
      </button>
    );
  }

  return (
    <div className="w-68 shrink-0 space-y-1.5 rounded-md border border-border bg-card p-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="컬럼 이름"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleSubmit();
          if (e.key === 'Escape') setIsAdding(false);
        }}
        className="h-8 text-sm"
      />
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs"
          onClick={() => void handleSubmit()}
          disabled={loading || !name.trim()}
        >
          추가
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => setIsAdding(false)}
          disabled={loading}
        >
          취소
        </Button>
      </div>
    </div>
  );
}
