import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import type { AuthBackend, AuthResult } from './auth-backend.js'
import { AuthError } from './auth-service.js'

export const SESSION_COOKIE = 'fitting_room_session'
export const REFRESH_COOKIE = 'fitting_room_refresh'

const readCookie = (request: Request, cookieName: string): string | null => {
  const cookieHeader = request.headers.cookie
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const [name, ...valueParts] = part.trim().split('=')
    if (name === cookieName) return decodeURIComponent(valueParts.join('='))
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

const passwordResetAttempts = new Map<string, { count: number; resetAt: number }>()
const PASSWORD_RESET_WINDOW_MS = 15 * 60 * 1000
let nextPasswordResetSweepAt = Date.now() + PASSWORD_RESET_WINDOW_MS

const enforcePasswordResetRateLimit = (request: Request, email?: string) => {
  const address = request.ip ?? request.socket.remoteAddress ?? 'unknown'
  const normalizedEmail = email?.trim().toLowerCase()
  const keys = [`ip:${address}`, ...(normalizedEmail ? [`account:${normalizedEmail}`] : [])]
  const now = Date.now()
  if (now >= nextPasswordResetSweepAt) {
    for (const [key, entry] of passwordResetAttempts) {
      if (entry.resetAt <= now) passwordResetAttempts.delete(key)
    }
    nextPasswordResetSweepAt = now + PASSWORD_RESET_WINDOW_MS
  }
  for (const key of keys) {
    const current = passwordResetAttempts.get(key)
    if (!current || current.resetAt <= now) {
      passwordResetAttempts.set(key, { count: 1, resetAt: now + PASSWORD_RESET_WINDOW_MS })
      continue
    }
    if (current.count >= 5) throw new AuthError(429, 'Bạn đã yêu cầu quá nhiều lần. Vui lòng đợi 15 phút.')
    current.count += 1
  }
}

type CookieOptions = { secure: boolean; sessionDays: number }

const setSessionCookies = (response: Response, result: AuthResult, options: CookieOptions) => {
  response.cookie(SESSION_COOKIE, result.token, {
    httpOnly: true, sameSite: 'lax', secure: options.secure, path: '/', expires: result.expiresAt,
  })
  if (result.refreshToken) {
    response.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: options.secure,
      path: '/',
      expires: new Date(Date.now() + options.sessionDays * 24 * 60 * 60 * 1000),
    })
  }
}

const resolveUser = async (auth: AuthBackend, request: Request, response: Response, options: CookieOptions) => {
  const token = readCookie(request, SESSION_COOKIE)
  const user = await auth.authenticate(token)
  if (user) return user
  const refreshed = await auth.refresh?.(readCookie(request, REFRESH_COOKIE))
  if (!refreshed) return null
  setSessionCookies(response, refreshed, options)
  return refreshed.user
}

export const createRequireAuth = (auth: AuthBackend, secureCookies = false, sessionDays = 30) => async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  try {
    const user = await resolveUser(auth, request, response, { secure: secureCookies, sessionDays })
    if (!user) {
      response.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục.', code: 'authentication_required' })
      return
    }
    request.authUser = user
    next()
  } catch (error) {
    next(error)
  }
}

export function createAuthRouter(auth: AuthBackend, secureCookies: boolean, sessionDays = 30) {
  const router = Router()
  const cookieOptions = { secure: secureCookies, sessionDays }

  router.post('/register', async (request, response, next) => {
    try {
      enforceLoginRateLimit(request)
      const result = await auth.register({
        email: typeof request.body.email === 'string' ? request.body.email : '',
        displayName: typeof request.body.displayName === 'string' ? request.body.displayName : '',
        password: typeof request.body.password === 'string' ? request.body.password : '',
        legacyClaimToken: request.get('x-legacy-data-claim-token'),
      })
      setSessionCookies(response, result, cookieOptions)
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
      setSessionCookies(response, result, cookieOptions)
      response.json({ user: result.user })
    } catch (error) {
      next(error)
    }
  })

  router.post('/forgot-password', async (request, response, next) => {
    try {
      if (!auth.requestPasswordReset) throw new AuthError(501, 'Khôi phục mật khẩu chưa được bật ở môi trường này.')
      const email = typeof request.body.email === 'string' ? request.body.email : ''
      enforcePasswordResetRateLimit(request, email)
      await auth.requestPasswordReset(email)
      // Luôn dùng thông báo chung để không tiết lộ email có tồn tại trong hệ thống hay không.
      response.status(202).json({
        message: 'Nếu email tồn tại, bạn sẽ nhận được liên kết đặt lại mật khẩu trong ít phút.',
      })
    } catch (error) {
      next(error)
    }
  })

  router.post('/reset-password', async (request, response, next) => {
    try {
      if (!auth.resetPassword) throw new AuthError(501, 'Khôi phục mật khẩu chưa được bật ở môi trường này.')
      enforcePasswordResetRateLimit(request)
      const result = await auth.resetPassword({
        accessToken: typeof request.body.accessToken === 'string' ? request.body.accessToken : '',
        refreshToken: typeof request.body.refreshToken === 'string' ? request.body.refreshToken : '',
        password: typeof request.body.password === 'string' ? request.body.password : '',
      })
      setSessionCookies(response, result, cookieOptions)
      response.json({ user: result.user })
    } catch (error) {
      next(error)
    }
  })

  router.get('/me', async (request, response, next) => {
    try {
      const user = await resolveUser(auth, request, response, cookieOptions)
      if (!user) {
        response.status(401).json({ message: 'Chưa đăng nhập.' })
        return
      }
      response.json({ user })
    } catch (error) {
      next(error)
    }
  })

  router.post('/logout', async (request, response, next) => {
    try {
      await auth.logout(readCookie(request, SESSION_COOKIE))
    } catch (error) {
      next(error)
      return
    }
    response.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: '/' })
    response.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: '/' })
    response.status(204).end()
  })

  return router
}
