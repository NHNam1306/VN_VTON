import type { NextFunction, Request, Response } from 'express'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export const setSecurityHeaders = (_request: Request, response: Response, next: NextFunction) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  // Vite development injects its React Refresh/HMR bootstrap at runtime.
  // A production CSP blocks that bootstrap and leaves the dev page blank, so
  // keep the strict policy on built deployments only.
  if (process.env.NODE_ENV === 'production') {
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; media-src 'self' blob:; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://staticimgly.com; worker-src 'self' blob:; form-action 'self'",
    )
  }
  next()
}

/**
 * Cookie-authenticated mutations must carry a header that a cross-site HTML form
 * cannot add. CORS remains disabled, so hostile origins cannot preflight it.
 */
export const requireMutationHeader = (request: Request, response: Response, next: NextFunction) => {
  if (SAFE_METHODS.has(request.method) || request.get('x-fitting-room-request') === '1') {
    next()
    return
  }
  response.status(403).json({
    message: 'Yêu cầu thay đổi dữ liệu không hợp lệ. Vui lòng tải lại trang.',
    code: 'csrf_check_failed',
  })
}
