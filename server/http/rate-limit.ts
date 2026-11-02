import type { NextFunction, Request, Response } from 'express'

type Entry = { count: number; resetAt: number }

export const createFixedWindowRateLimit = (options: {
  max: number
  windowMs: number
  key: (request: Request) => string
}) => {
  const entries = new Map<string, Entry>()
  let nextSweepAt = Date.now() + options.windowMs

  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now()
    if (now >= nextSweepAt) {
      for (const [key, entry] of entries) if (entry.resetAt <= now) entries.delete(key)
      nextSweepAt = now + options.windowMs
    }

    const key = options.key(request)
    const current = entries.get(key)
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : current
    entry.count += 1
    entries.set(key, entry)

    response.setHeader('X-RateLimit-Limit', String(options.max))
    response.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.max - entry.count)))
    if (entry.count > options.max) {
      response.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))))
      response.status(429).json({ message: 'Bạn đã gửi quá nhiều yêu cầu AI. Vui lòng thử lại sau.' })
      return
    }
    next()
  }
}
