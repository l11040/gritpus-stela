'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { AlertCircle, KeyRound } from 'lucide-react';
import { useAdminUsers } from '../hooks/use-admin-users';

export function AdminUserManagement() {
  const {
    currentUserId,
    pendingUsers,
    approvedUsers,
    loading,
    resetPasswordTarget,
    resettingPassword,
    setResetPasswordTarget,
    handleApprove,
    handleRoleChange,
    handleDelete,
    handleResetPassword,
  } = useAdminUsers();

  return (
    <div className="space-y-6">
      {/* Pending */}
      {pendingUsers.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle className="size-4 text-amber-500" />
            <h3 className="text-sm font-medium">
              승인 대기 ({pendingUsers.length}명)
            </h3>
          </div>
          <div className="space-y-1">
            {pendingUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2.5 dark:border-amber-900 dark:bg-amber-950/30"
              >
                <div>
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {u.email} · {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleApprove(u.id, true)}
                    disabled={loading[u.id]}
                  >
                    승인
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleDelete(u.id)}
                    disabled={loading[u.id]}
                  >
                    거절
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          전체 사용자 ({approvedUsers.length}명)
        </h3>
        <div className="space-y-1">
          {approvedUsers.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {u.name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <Badge
                  variant={u.role === 'admin' ? 'default' : 'secondary'}
                  className="text-[10px]"
                >
                  {u.role}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                {u.id !== currentUserId ? (
                  <>
                    <Select
                      value={u.role}
                      onValueChange={(v) => handleRoleChange(u.id, v)}
                      disabled={loading[u.id]}
                    >
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">admin</SelectItem>
                        <SelectItem value="user">user</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setResetPasswordTarget(u)}
                      disabled={loading[u.id]}
                      title="비밀번호 초기화"
                    >
                      <KeyRound className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => handleApprove(u.id, false)}
                      disabled={loading[u.id]}
                    >
                      승인 취소
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDelete(u.id)}
                      disabled={loading[u.id]}
                    >
                      삭제
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">나</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={!!resetPasswordTarget}
        onOpenChange={(open) => !open && setResetPasswordTarget(null)}
        title="비밀번호 초기화"
        description={`${resetPasswordTarget?.name}(${resetPasswordTarget?.email})의 비밀번호를 qwer1234@로 초기화하시겠습니까?`}
        confirmLabel="초기화"
        variant="default"
        loading={resettingPassword}
        onConfirm={handleResetPassword}
      />
    </div>
  );
}
