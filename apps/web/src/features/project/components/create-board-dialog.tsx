'use client';

import { useState } from 'react';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface CreateBoardDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateBoardDialog({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: CreateBoardDialogProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await fetcher({
        url: `/projects/${projectId}/boards`,
        method: 'POST',
        data: { name },
      });
      setName('');
      onOpenChange(false);
      onCreated();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">새 보드 만들기</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">보드 이름</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 스프린트 #1"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" size="sm" disabled={loading || !name.trim()}>
              만들기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
