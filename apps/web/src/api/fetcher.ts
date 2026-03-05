import { getAccessToken } from '@/lib/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50002';

export const fetcher = async <T>({
  url,
  method,
  params,
  data,
}: {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: Record<string, string>;
  data?: unknown;
}): Promise<T> => {
  const search = params ? `?${new URLSearchParams(params)}` : '';
  const token = getAccessToken();
  const headers: Record<string, string> = {};

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (data) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${BASE_URL}${url}${search}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `${response.status} ${response.statusText}`);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;

  return JSON.parse(text) as T;
};
