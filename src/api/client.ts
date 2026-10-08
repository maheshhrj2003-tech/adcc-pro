import { ApiError, ApiErrorBody } from './types';
import { getToken } from './tokenStorage';

export const BASE_URL = 'https://admin.adccpro.com/api/v1';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  body?: unknown;
  auth?: boolean; // attach bearer token
}

// Fired whenever a request comes back 401 (revoked/invalid token), so the
// app can react globally (e.g. drop the session and return to login).
type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;
export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListener = listener;
}

function log(...args: unknown[]) {
  if (__DEV__) console.log('[api]', ...args);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = options;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    else log(`${method} ${path} — requested WITH auth but no token is stored`);
  }

  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const startedAt = Date.now();
  log(`→ ${method} ${url}`, body !== undefined ? { body } : '');

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    log(`✗ ${method} ${url} — network error (no response reached the server)`, networkErr);
    throw networkErr;
  }

  const elapsedMs = Date.now() - startedAt;

  // Signed download links that expired/were tampered with come back as a
  // plain 403 with no JSON body — guard JSON parsing accordingly.
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : null;

  log(`← ${res.status} ${method} ${url} (${elapsedMs}ms)`, data ?? '(no JSON body)');

  if (!res.ok) {
    if (res.status === 401 && unauthorizedListener) {
      log('401 received — clearing session and redirecting');
      unauthorizedListener();
    }
    const body: ApiErrorBody | null = data;
    const message = body?.message || `Request failed with status ${res.status}`;
    throw new ApiError(res.status, body, message);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, auth = false) => apiRequest<T>(path, { method: 'GET', auth }),
  post: <T>(path: string, body?: unknown, auth = false) =>
    apiRequest<T>(path, { method: 'POST', body, auth }),
  delete: <T>(path: string, auth = false) => apiRequest<T>(path, { method: 'DELETE', auth }),
};
