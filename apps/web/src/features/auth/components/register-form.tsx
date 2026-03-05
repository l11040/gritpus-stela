'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RegisterForm() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const message = await register(email, password, name);
      setSuccess(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">회원가입</h1>
        <p className="text-balance text-sm text-muted-foreground">
          새 계정을 만드세요
        </p>
      </div>
      <div className="grid gap-6">
        {success && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            {success}
          </div>
        )}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="name">이름</Label>
          <Input
            id="name"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            placeholder="6자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? '가입 중...' : '회원가입'}
        </Button>
      </div>
      <div className="text-center text-sm">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="underline underline-offset-4">
          로그인
        </Link>
      </div>
    </form>
  );
}
