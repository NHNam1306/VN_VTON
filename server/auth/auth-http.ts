import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import type { AuthService } from './auth-service.js'
import { AuthError } from './auth-service.js'

export const SESSION_COOKIE = 'fitting_room_session'

const readCookie = (request: Request): string | null => {
  const cookieHeader = request.headers.cookie
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const [name, ...valueParts] = part.trim().split('=')
    if (name === SESSION_COOKIE) return decodeURIComponent(valueParts.join('='))
  }
  return null
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const LOGIN_WINDOW_MS = 15 * 60 * 1000
let nextAttemptSweepAt = Date.now() + LOGIN_WINDOW_MS

const enforceLoginRateLimit = (request: Request, account?: string) => {
  const address = request.ip ?? request.socket.remoteAddress ?? 'unknown'
  const keys = [`ip:${address}`]
  const normalizedAccount = account?.trim().toLowerCase()
  if (normalizedAccount) keys.push(`account:${normalizedAccount}`)
  const now = Date.now()
  if (now >= nextAttemptSweepAt) {
    for (const [key, entry] of loginAttempts) if (entry.resetAt <= now) loginAttempts.delete(key)
    nextAttemptSweepAt = now + LOGIN_WINDOW_MS
  }
  for (const key of keys) {
    const current = loginAttempts.get(key)
    if (!current || current.resetAt <= now) {
      loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
      continue
    }
    if (current.count >= 10) throw new AuthError(429, 'Bạn đã thử quá nhiều lần. Vui lòng đợi 15 phút.')
    current.count += 1
  }
}

const clearAccountAttempts = (email: string) => loginAttempts.delete(`account:${email.trim().toLowerCase()}`)

export const createRequireAuth = (auth: AuthService) => (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  const user = auth.authenticate(readCookie(request))
  if (!user) {
    response.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục.', code: 'authentication_required' })
    return
  }
  request.authUser = user
  next()
}

export function createAuthRouter(auth: AuthService, secureCookies: boolean) {
  const router = Router()
  const setSessionCookie = (response: Response, token: string, expiresAt: Date) => {
    response.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookies,
      path: '/',
      expires: expiresAt,
    })
  }

  router.post('/register', async (request, response, next) => {
    try {
      enforceLoginRateLimit(request)
      const result = await auth.register({
        email: typeof request.body.email === 'string' ? request.body.email : '',
        displayName: typeof request.body.displayName === 'string' ? request.body.displayName : '',
        password: typeof request.body.password === 'string' ? request.body.password : '',
        legacyClaimToken: request.get('x-legacy-data-claim-token'),
      })
      setSessionCookie(response, result.token, result.expiresAt)
      response.status(201).json({ user: result.user })
    } catch (error) {
      next(error)
    }
  })

  router.post('/login', async (request, response, next) => {
    try {
      const email = typeof request.body.email === 'string' ? request.body.email : ''
      enforceLoginRateLimit(request, email)
      const result = await auth.login(
        email,
        typeof request.body.password === 'string' ? request.body.password : '',
      )
      clearAccountAttempts(email)
      setSessionCookie(response, result.token, result.expiresAt)
      response.json({ user: result.user })
    } catch (error) {
      next(error)
    }
  })

  router.get('/me', (request, response) => {
    const user = auth.authenticate(readCookie(request))
    if (!user) {
      response.status(401).json({ message: 'Chưa đăng nhập.' })
      return
    }
    response.json({ user })
  })

  router.post('/logout', (request, response) => {
    auth.logout(readCookie(request))
    response.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: '/' })
    response.status(204).end()
  })

  return router
}
