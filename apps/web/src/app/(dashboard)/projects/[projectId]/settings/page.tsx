'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { fetcher } from '@/api/fetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Member {
  id: string;
  role: string;
  user: { name: string; email: string };
}

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const loadMembers = useCallback(() => {
    fetcher<Member[]>({ url: `/projects/${projectId}/members`, method: 'GET' })
      .then(setMembers)
      .catch(() => {});
  }, [projectId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await fetcher({
        url: `/projects/${projectId}/members`,
        method: 'POST',
        data: { email },
      });
      setEmail('');
      loadMembers();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">프로젝트 설정</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">멤버 초대</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addMember} className="flex gap-2">
            <div className="flex-1">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="초대할 이메일"
              />
            </div>
            <Button type="submit" disabled={loading}>
              초대
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">멤버 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-medium">{m.user.name}</div>
                <div className="text-sm text-muted-foreground">{m.user.email}</div>
              </div>
              <Badge variant="secondary">{m.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
