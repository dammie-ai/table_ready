// Only use the deployed backend when actually served from the deployed
// static site's own domain — everything else (localhost, 127.0.0.1, a LAN
// IP when opened from another device on the same network, etc.) is local
// dev and should hit the local backend. The old check only matched the
// literal string "localhost", so opening this via a LAN IP silently fell
// through to the deployed backend instead, which doesn't have local-only
// test accounts.
const DEPLOYED_API = 'https://tableready-backend.onrender.com'
const DEPLOYED_HOSTS = ['tableready-staff-web.onrender.com']
export const API_ORIGIN = typeof window !== 'undefined' && DEPLOYED_HOSTS.includes(window.location.hostname)
  ? DEPLOYED_API
  : `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8001`
const API_BASE = `${API_ORIGIN}/api`

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    // Mirrors authStore's own storage choice (sessionStorage, not
    // localStorage) -- reading the wrong one here would silently send no
    // token at all once the store moved, since this reads independently
    // rather than through Zustand.
    const stored = sessionStorage.getItem('tableready_auth')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        return parsed.state?.token || null
      } catch {
        return null
      }
    }
  }
  return null
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || data.message || 'API request failed')
  }
  return data as T
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) =>
    request<T>(path, {
      method: 'DELETE',
    }),
}
