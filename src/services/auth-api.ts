import type { AuthUser } from '../types/auth'
import { apiFetch } from './api-client'

const parseError = async (response: Response) => {
  try {
    const data = await response.json() as { message?: string }
    return data.message ?? 'Yêu cầu không thành công.'
  } catch {
    return 'Yêu cầu không thành công.'
  }
}

export const authApi = {
  async me(): Promise<AuthUser | null> {
    const response = await fetch('/api/auth/me')
    if (response.status === 401) return null
    if (!response.ok) throw new Error(await parseError(response))
    return ((await response.json()) as { user: AuthUser }).user
  },

  async register(input: { displayName: string; email: string; password: string }): Promise<AuthUser> {
    const response = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error(await parseError(response))
    return ((await response.json()) as { user: AuthUser }).user
  },

  async login(input: { email: string; password: string }): Promise<AuthUser> {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error(await parseError(response))
    return ((await response.json()) as { user: AuthUser }).user
  },

  async logout(): Promise<void> {
    const response = await apiFetch('/api/auth/logout', { method: 'POST' })
    if (!response.ok) throw new Error(await parseError(response))
  },
}
