// @vitest-environment node
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { runtimeConfig } from '../config/runtime-config.js'
import type { AuthBackend, AuthResult } from './auth-backend.js'
import { createAuthRouter, OAUTH_COOKIE, SESSION_COOKIE } from './auth-http.js'

const result: AuthResult = {
  user: { id: 'user-1', email: 'lan@gmail.com', displayName: 'Lan Nguyễn', createdAt: '2026-11-11T00:00:00.000Z', role: 'user', status: 'active', hasPassword: false },
  token: 'access-token',
  refreshToken: 'refresh-token',
  expiresAt: new Date(Date.now() + 3600_000),
}

describe('Google sign-in routes', () => {
  let server: Server
  let baseUrl: string
  const exchanged: Array<[string, string]> = []
  const backend: AuthBackend = {
    register: async () => result,
    login: async () => result,
    authenticate: async () => null,
    logout: async () => undefined,
    createOAuthRequest: () => ({ url: 'https://project.supabase.co/auth/v1/authorize?provider=google', codeVerifier: 'verifier-123' }),
    exchangeOAuthCode: async (code, verifier) => {
      exchanged.push([code, verifier])
      if (code !== 'good-code') throw new Error('bad code')
      return result
    },
  }

  beforeAll(() => {
    const app = express()
    app.use('/api/auth', createAuthRouter(backend, false))
    server = app.listen(0)
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(() => new Promise<void>(resolve => server.close(() => resolve())))
  afterEach(() => { runtimeConfig.googleAuthEnabled = false; exchanged.length = 0 })

  const cookieValue = (response: Response, name: string) => response.headers.getSetCookie()
    .map(value => value.split(';')[0])
    .find(value => value.startsWith(name + '='))

  it('hides Google until it is enabled on the server', async () => {
    expect(await (await fetch(`${baseUrl}/api/auth/providers`)).json()).toEqual({ google: false })
    const start = await fetch(`${baseUrl}/api/auth/oauth/google`, { redirect: 'manual' })
    expect(start.status).toBe(303)
    expect(start.headers.get('location')).toBe('/?auth_error=google_unavailable')
    runtimeConfig.googleAuthEnabled = true
    expect(await (await fetch(`${baseUrl}/api/auth/providers`)).json()).toEqual({ google: true })
  })

  it('signs in through Google and returns to the requested page', async () => {
    runtimeConfig.googleAuthEnabled = true
    const start = await fetch(`${baseUrl}/api/auth/oauth/google?next=/koc`, { redirect: 'manual' })
    expect(start.status).toBe(302)
    expect(start.headers.get('location')).toContain('/auth/v1/authorize')
    const pending = cookieValue(start, OAUTH_COOKIE)
    expect(pending).toBeTruthy()
    expect(start.headers.getSetCookie().find(value => value.startsWith(OAUTH_COOKIE))).toMatch(/HttpOnly/i)

    const callback = await fetch(`${baseUrl}/api/auth/oauth/callback?code=good-code`, { redirect: 'manual', headers: { Cookie: pending! } })
    expect(callback.status).toBe(303)
    expect(callback.headers.get('location')).toBe('/koc')
    expect(exchanged).toEqual([['good-code', 'verifier-123']])
    expect(cookieValue(callback, SESSION_COOKIE)).toBe(`${SESSION_COOKIE}=access-token`)
  })

  it('refuses a callback that did not start in this browser', async () => {
    runtimeConfig.googleAuthEnabled = true
    const callback = await fetch(`${baseUrl}/api/auth/oauth/callback?code=good-code`, { redirect: 'manual' })
    expect(callback.headers.get('location')).toBe('/?auth_error=google_expired')
    expect(exchanged).toEqual([])
    expect(cookieValue(callback, SESSION_COOKIE)).toBeUndefined()
  })

  it('reports a cancelled or failed Google sign-in without a session', async () => {
    runtimeConfig.googleAuthEnabled = true
    const start = await fetch(`${baseUrl}/api/auth/oauth/google`, { redirect: 'manual' })
    const pending = cookieValue(start, OAUTH_COOKIE)!
    const cancelled = await fetch(`${baseUrl}/api/auth/oauth/callback?error=access_denied`, { redirect: 'manual', headers: { Cookie: pending } })
    expect(cancelled.headers.get('location')).toBe('/?auth_error=google_cancelled')
    const failed = await fetch(`${baseUrl}/api/auth/oauth/callback?code=forged`, { redirect: 'manual', headers: { Cookie: pending } })
    expect(failed.headers.get('location')).toBe('/?auth_error=google_failed')
    expect(cookieValue(failed, SESSION_COOKIE)).toBeUndefined()
  })

  it('never redirects off-site after sign-in', async () => {
    runtimeConfig.googleAuthEnabled = true
    for (const next of ['//evil.example', 'https://evil.example', '/\\evil.example', '/api/auth/logout']) {
      const start = await fetch(`${baseUrl}/api/auth/oauth/google?next=${encodeURIComponent(next)}`, { redirect: 'manual' })
      const callback = await fetch(`${baseUrl}/api/auth/oauth/callback?code=good-code`, { redirect: 'manual', headers: { Cookie: cookieValue(start, OAUTH_COOKIE)! } })
      expect(callback.headers.get('location')).toBe('/')
    }
  })
})
