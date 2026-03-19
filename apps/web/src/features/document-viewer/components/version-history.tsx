'use client';

import { useEffect, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDocumentVersions } from '../hooks/use-document-versions';

interface VersionHistoryProps {
  documentId: string;
  currentVersion: number;
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
}

export function VersionHistory({
  documentId,
  currentVersion,
  isOpen,
  onClose,
  onRestore,
}: VersionHistoryProps) {
  const { versions, isLoading, fetchVersions, restoreVersion } =
    useDocumentVersions(documentId);
  const [restoreTarget, setRestoreTarget] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) fetchVersions();
  }, [isOpen, fetchVersions]);

  const handleRestore = async () => {
    if (restoreTarget === null) return;
    await restoreVersion(restoreTarget);
    setRestoreTarget(null);
    onRestore();
    onClose();
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-[400px] sm:w-[440px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="size-4" />
              버전 이력
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-md bg-muted"
                  />
                ))}
              </div>
            ) : versions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                버전 이력이 없습니다.
              </p>
            ) : (
              <div className="relative space-y-0">
                {versions.map((ver, i) => {
                  const isCurrent = ver.version === currentVersion;
                  return (
                    <div key={ver.id} className="relative flex gap-3 pb-4">
                      {/* 타임라인 라인 */}
                      {i < versions.length - 1 && (
                        <div className="absolute left-[7px] top-5 h-full w-px bg-border" />
                      )}
                      {/* 타임라인 도트 */}
                      <div
                        className={`relative z-10 mt-1.5 size-[15px] shrink-0 rounded-full border-2 ${
                          isCurrent
                            ? 'border-primary bg-primary'
                            : 'border-border bg-background'
                        }`}
                      />
                      {/* 내용 */}
                      <div className="min-w-0 flex-1 rounded-md border border-border p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            v{ver.version}
                          </span>
                          {isCurrent && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              현재
                            </Badge>
                          )}
                        </div>
                        {ver.changeNote && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {ver.changeNote}
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {ver.createdBy?.name || '알 수 없음'} ·{' '}
                            {new Date(ver.createdAt).toLocaleString('ko-KR')}
                          </span>
                          {!isCurrent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => setRestoreTarget(ver.version)}
                            >
                              <RotateCcw className="size-3" />
                              복원
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={restoreTarget !== null}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>버전 복원</AlertDialogTitle>
            <AlertDialogDescription>
              v{restoreTarget} 버전으로 복원하시겠습니까? 현재 내용이 새로운
              버전으로 저장된 후 복원됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>복원</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
