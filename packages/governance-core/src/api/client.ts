/**
 * Thin fetch wrapper for the NTE backend. Every call that needs auth reads
 * the token from the same localStorage key useAuth manages -- there is no
 * global mutable client-side state beyond that token.
 */

const TOKEN_KEY = 'nte:auth-token';

export function getApiBaseUrl(): string {
  const fromEnv = (import.meta as any).env?.VITE_API_BASE_URL;
  return typeof fromEnv === 'string' && fromEnv ? fromEnv : 'http://localhost:4000';
}

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage failures
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(res.status, payload?.error ?? `Request failed (${res.status})`);
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) => request<T>(path, { method: 'POST', body, ...opts }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/** For multipart requests (file upload) where we can't use the JSON helper above. */
export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  const token = getToken();
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, payload?.error ?? `Upload failed (${res.status})`);
  return payload as T;
}

/** For endpoints that return a binary body (PDF export) instead of JSON. */
export async function apiPostBlob(path: string, body: unknown): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${getApiBaseUrl()}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new ApiError(res.status, payload?.error ?? `Request failed (${res.status})`);
  }
  return res.blob();
}

export function apiDownloadUrl(path: string) {
  // Downloads happen via <a href>, which can't set an Authorization header,
  // so we pass the token as a query param the server also accepts for this one route.
  const token = getToken();
  return `${getApiBaseUrl()}${path}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}
