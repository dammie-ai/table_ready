// Only use localhost when actually served from localhost (local dev) —
// a deployed build needs the real deployed backend instead.
const DEPLOYED_API = 'https://tableready-backend.onrender.com'
export const API_ORIGIN = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8001'
  : DEPLOYED_API
const API_BASE = `${API_ORIGIN}/api`

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('tableready_auth')
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
