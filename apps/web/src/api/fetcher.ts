const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50002';

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (isRefreshing) return refreshPromise!;

  isRefreshing = true;
  refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
}

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
  const headers: Record<string, string> = {};

  if (data) headers['Content-Type'] = 'application/json';

  let response = await fetch(`${BASE_URL}${url}${search}`, {
    method,
    headers,
    credentials: 'include',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (response.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      response = await fetch(`${BASE_URL}${url}${search}`, {
        method,
        headers,
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined,
      });
    }
  }

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
