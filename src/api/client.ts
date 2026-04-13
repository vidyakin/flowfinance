const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T | undefined> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  if (res.status === 204) {
    return undefined
  }

  return res.json() as Promise<T>
}

export const api = {
  get<T>(path: string): Promise<T | undefined> {
    return request<T>(path)
  },

  post<T>(path: string, body: unknown): Promise<T | undefined> {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  put<T>(path: string, body: unknown): Promise<T | undefined> {
    return request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  delete(path: string): Promise<undefined> {
    return request(path, { method: 'DELETE' })
  },
}
