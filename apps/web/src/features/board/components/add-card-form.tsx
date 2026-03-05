'use client';

import { Plus } from 'lucide-react';

interface AddCardFormProps {
  onAdd: (title: string) => void;
}

export function AddCardForm({ onAdd }: AddCardFormProps) {
  return (
    <button
      className="mt-1.5 flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      onClick={() => onAdd('제목 없음')}
    >
      <Plus className="size-3.5" />
      카드 추가
    </button>
  );
}
