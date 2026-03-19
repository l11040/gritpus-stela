'use client';

import { useEffect } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocumentVersions } from '../hooks/use-document-versions';

interface VersionHistoryProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
}

export function VersionHistory({
  documentId,
  isOpen,
  onClose,
  onRestore,
}: VersionHistoryProps) {
  const { versions, isLoading, fetchVersions, restoreVersion } =
    useDocumentVersions(documentId);

  useEffect(() => {
    if (isOpen) fetchVersions();
  }, [isOpen, fetchVersions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <History className="size-4" />
            버전 이력
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded bg-muted"
                />
              ))}
            </div>
          ) : versions.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              버전 이력이 없습니다.
            </p>
          ) : (
            <div className="space-y-1">
              {versions.map((ver) => (
                <div
                  key={ver.id}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/60"
                >
                  <div>
                    <div className="text-sm font-medium">
                      v{ver.version}
                      {ver.changeNote && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {ver.changeNote}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ver.createdBy?.name || '알 수 없음'} ·{' '}
                      {new Date(ver.createdAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={async () => {
                      await restoreVersion(ver.version);
                      onRestore();
                      onClose();
                    }}
                  >
                    <RotateCcw className="size-3" />
                    복원
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
