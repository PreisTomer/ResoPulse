// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string ?? 'http://localhost:3001').replace(/\/$/, '')

/** Returns the current Clerk JWT, or null for guests / unauthenticated state. */
export async function getAuthToken(): Promise<string | null> {
  return (await window.Clerk?.session?.getToken()) ?? null
}

/** Authenticated JSON fetch. Throws if no session token, non-ok status, or network failure. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAuthToken()
  if (!token) throw new Error('Not authenticated')
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T
  return res.json() as Promise<T>
}
