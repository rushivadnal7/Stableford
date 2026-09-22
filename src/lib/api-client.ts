'use client';

/** The shape every API route returns on failure (see lib/errors.ts's `errorResponse`). */
export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Calls one of our own JSON API routes from a client component. Sends the Supabase session cookie
 * automatically (same origin), parses `{ error: { code, message } }` into a catchable ApiClientError,
 * and otherwise returns the parsed body.
 */
export async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as { error?: { code: string; message: string; details?: unknown } } | null)?.error;
    throw new ApiClientError(res.status, err?.code ?? 'unknown', err?.message ?? 'Something went wrong.', err?.details);
  }
  return body as T;
}

export const apiGet = <T = unknown>(url: string) => apiFetch<T>(url);
export const apiPost = <T = unknown>(url: string, data?: unknown) =>
  apiFetch<T>(url, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) });
export const apiPatch = <T = unknown>(url: string, data: unknown) => apiFetch<T>(url, { method: 'PATCH', body: JSON.stringify(data) });
export const apiDelete = <T = unknown>(url: string) => apiFetch<T>(url, { method: 'DELETE' });
