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
  const response = await fetch(`${BASE_URL}${url}${search}`, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : {},
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
};
