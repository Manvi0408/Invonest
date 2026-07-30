'use client';

/**
 * Single entry point for talking to the InvoNest API.
 *
 * Every route except /api/auth/* is behind the JwtAuthGuard, so requests must
 * carry the bearer token issued at login. Centralising it here means call sites
 * never hand-roll the header — and a 401 always lands the user back on /login
 * instead of failing silently.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'invonest_token';
const USER_KEY = 'invonest_user';
const ORG_KEY = 'invonest_org';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser<T = any>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function getStoredOrg<T = any>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(ORG_KEY) || 'null');
  } catch {
    return null;
  }
}

/** Counterpart to clearSession — used by login and by the workspace switcher,
    which receives a fresh token carrying a different orgId. */
export function setSession(token: string, user: unknown, org: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(ORG_KEY, JSON.stringify(org));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ORG_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Thrown when the plan blocks the action — carries the payload Part 3 renders. */
export class QuotaError extends ApiError {
  constructor(message: string, body?: any) {
    super(402, message, body);
    this.name = 'QuotaError';
  }
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip the redirect-to-login on 401 (used by the login page itself). */
  allowUnauthenticated?: boolean;
}

export async function apiFetch<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, allowUnauthenticated, headers, ...rest } = options;
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401 && !allowUnauthenticated) {
    // A demo session carries a token but no stored user. If its token lapses we
    // clear it but must NOT bounce to /login — the demo has no login wall; only
    // the account page asks a real visitor to sign in.
    const wasDemo = typeof window !== 'undefined' && !localStorage.getItem(USER_KEY);
    clearSession();
    if (typeof window !== 'undefined' && !wasDemo && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }

  let payload: any = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message = payload?.message || res.statusText || 'Request failed';
    // 402 = plan limit hit. Surfaced separately so the UI can show an upgrade prompt.
    if (res.status === 402) throw new QuotaError(message, payload);
    throw new ApiError(res.status, message, payload);
  }

  return payload as T;
}

export const api = {
  get: <T = any>(path: string, options?: ApiOptions) => apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T = any>(path: string, body?: unknown, options?: ApiOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T = any>(path: string, body?: unknown, options?: ApiOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  // `del` rather than `delete` — the latter is a reserved word and can't be a
  // shorthand method name here.
  del: <T = any>(path: string, options?: ApiOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
