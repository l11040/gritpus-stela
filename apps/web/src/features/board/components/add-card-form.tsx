'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

interface AddCardFormProps {
  onAdd: (title: string) => void;
}

export function AddCardForm({ onAdd }: AddCardFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd(title);
    setTitle('');
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <button
        className="mt-1.5 flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        onClick={() => setIsAdding(true)}
      >
        <Plus className="size-3.5" />
        카드 추가
      </button>
    );
  }

  return (
    <div className="mt-1.5 space-y-1.5">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="카드 제목"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') setIsAdding(false);
        }}
        className="h-8 text-sm"
      />
      <div className="flex gap-1">
        <Button size="sm" className="h-7 text-xs" onClick={handleSubmit}>
          추가
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => setIsAdding(false)}
        >
          취소
        </Button>
      </div>
    </div>
  );
}
