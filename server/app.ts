import express, { type ErrorRequestHandler } from 'express'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import type { GarmentRepository } from './storage/garment-repository.js'
import type { ImageStorage } from './storage/image-storage.js'
import type { UserDataRepository } from './storage/user-data-repository.js'
import { createGarmentRouter } from './routes/garments.js'
import { createUserDataRouter } from './routes/user-data.js'
import { createGenerationRouter } from './routes/generations.js'
import { createMockImageRouter } from './routes/mock-images.js'
import type { ImageProvider } from './providers/image-provider.js'
import { ImageProviderError } from './providers/image-provider-error.js'
import type { AuthBackend } from './auth/auth-backend.js'
import { AuthError } from './auth/auth-service.js'
import { createAuthRouter, createRequireAuth } from './auth/auth-http.js'
import { GarmentExtractorService } from './services/garment-extractor.js'
import type { SocialService } from './social/social-service.js'
import { createSocialRouter } from './social/router.js'
import { runtimeConfig } from './config/runtime-config.js'
import { requireMutationHeader, setSecurityHeaders } from './http/security.js'
import type { AdminService } from './admin/admin-service.js'
import { createAdminRouter } from './admin/router.js'
import {
  createTokenBucketRateLimit,
  MemoryRateLimitStore,
  type RateLimitStore,
} from './http/rate-limit.js'
import { CreditService } from './credits/credit-service.js'
import { MemoryCreditRepository } from './credits/memory-credit-repository.js'
import { PlanService } from './plans/plan-service.js'
import { MemoryPlanRepository } from './plans/memory-plan-repository.js'
import { createPlanRouter } from './plans/router.js'
import type { BillingService } from './billing/billing-service.js'
import { createBillingRouter, createBillingWebhookRouter } from './billing/router.js'

export function createApp(
  repository: GarmentRepository,
  userDataRepository: UserDataRepository,
  images: ImageStorage,
  _uploadDirectory: string,
  imageProvider: ImageProvider,
  authService: AuthBackend,
  secureCookies = false,
  garmentExtractor?: GarmentExtractorService,
  social?: SocialService,
  admin?: AdminService,
  rateLimitStore?: RateLimitStore,
  creditService?: CreditService,
  planService?: PlanService,
  billingService?: BillingService,
  readinessCheck?: () => Promise<void>,
) {
  const app = express()
  const signedImageTtlSeconds = Math.min(3_600, Math.max(60, Number(process.env.R2_SIGNED_READ_TTL_SECONDS ?? 300) || 300))
  const ownImageKeyRequests = new Map<string, Promise<Set<string>>>()
  const sharedRateLimits = rateLimitStore ?? new MemoryRateLimitStore()
  const plans = planService ?? new PlanService(new MemoryPlanRepository())
  const credits = creditService ?? new CreditService(new MemoryCreditRepository(), plans)
  app.disable('x-powered-by')
  if (runtimeConfig.trustProxyHops) app.set('trust proxy', runtimeConfig.trustProxyHops)
  app.use(setSecurityHeaders)
  app.use((request, response, next) => {
    const startedAt = performance.now()
    const incomingId = request.get('x-request-id')
    const requestId = incomingId && /^[a-zA-Z0-9_-]{8,100}$/.test(incomingId) ? incomingId : randomUUID()
    response.setHeader('X-Request-ID', requestId)
    response.on('finish', () => {
      const durationMs = Math.round(performance.now() - startedAt)
      if (durationMs >= 1_000 || response.statusCode >= 400) {
        console.info(JSON.stringify({ type: 'http_request', requestId, method: request.method, path: request.path, status: response.statusCode, durationMs }))
      }
    })
    next()
  })
  app.use('/api', createTokenBucketRateLimit({
    requestsPerMinute: runtimeConfig.apiRequestsPerMinute,
    burst: runtimeConfig.apiBurst,
    skip: (request) => request.path === '/health',
  }))
  app.use(express.json({ limit: '32kb' }))
  if (billingService) app.use('/api/billing/webhooks', createBillingWebhookRouter(billingService))
  app.use('/api', requireMutationHeader)

  const extractor =
    garmentExtractor ??
    new GarmentExtractorService(images, {
      isMock: process.env.IMAGE_PROVIDER === 'mock',
      openrouterApiKey: process.env.OPENROUTER_API_KEY,
      fluxModel: process.env.OPENROUTER_IMAGE_MODEL,
      visionModel: process.env.OPENROUTER_VISION_MODEL,
    })

  app.get('/api/health', async (_request, response) => {
    try {
      await readinessCheck?.()
      response.json({ status: 'ok', ready: true })
    } catch {
      response.status(503).json({ status: 'degraded', ready: false })
    }
  })
  const decorateUser = admin ? (user: Parameters<AdminService['resolveAuthenticatedUser']>[0]) => admin.resolveAuthenticatedUser(user) : undefined
  app.use('/api/auth', createAuthRouter(authService, secureCookies, runtimeConfig.authSessionDays, decorateUser, sharedRateLimits))
  const requireAuth = createRequireAuth(authService, secureCookies, runtimeConfig.authSessionDays, decorateUser)

  const getOwnImageKeys = (userId: string) => {
    const pending = ownImageKeyRequests.get(userId)
    if (pending) return pending
    const request = Promise.all([
      repository.list(userId),
      userDataRepository.getPersonImage(userId),
      userDataRepository.listTryOnResults(userId),
      userDataRepository.listSavedOutfits(userId),
    ]).then(([garments, person, results, outfits]) => new Set([
      ...garments.flatMap((item) => [
        item.frontOriginalKey, item.frontProcessedKey, item.backOriginalKey, item.backProcessedKey,
      ]),
      person?.imageKey,
      ...results.map((item) => item.imageKey),
      ...outfits.flatMap((item) => [item.frontImageKey, item.backImageKey]),
    ].filter((value): value is string => Boolean(value))))
    ownImageKeyRequests.set(userId, request)
    const scheduleCleanup = () => {
      setTimeout(() => {
        if (ownImageKeyRequests.get(userId) === request) ownImageKeyRequests.delete(userId)
      }, 500)
    }
    void request.then(scheduleCleanup, scheduleCleanup)
    return request
  }

  app.get('/uploads/:key', requireAuth, async (request, response, next) => {
    try {
      const rawKey = request.params.key
      if (typeof rawKey !== 'string') {
        response.status(400).end()
        return
      }
      const key = decodeURIComponent(rawKey)
      const isOwnImage = (await getOwnImageKeys(request.authUser.id)).has(key)
      const canReadSharedImage = !isOwnImage && social
        ? await social.canReadImage(request.authUser.id, key)
        : false
      if (!isOwnImage && !canReadSharedImage) {
        response.status(404).end()
        return
      }
      // Normal display traffic goes straight to R2. The explicit proxy mode is reserved
      // for the rare browser-side image processing path that needs a same-origin response.
      if (images.createReadUrl && request.query.proxy !== '1') {
        const signedUrl = await images.createReadUrl(key, signedImageTtlSeconds)
        response.setHeader('Cache-Control', `private, max-age=${Math.max(30, signedImageTtlSeconds - 30)}`)
        response.setHeader('Vary', 'Authorization, Cookie')
        response.redirect(302, signedUrl)
        return
      }
      response.setHeader('Cache-Control', 'private, max-age=86400, immutable')
      if (images.openStream) {
        const image = await images.openStream(key)
        response.type(image.mimeType)
        if (image.contentLength !== undefined) response.setHeader('Content-Length', String(image.contentLength))
        for await (const chunk of image.body) {
          if (response.destroyed) return
          if (!response.write(chunk)) await new Promise<void>((resolve) => response.once('drain', resolve))
        }
        response.end()
      } else {
        const image = await images.read(key)
        response.type(image.mimeType).send(image.buffer)
      }
    } catch (error) {
      next(error)
    }
  })
  if (social) app.use('/api/social', requireAuth, createSocialRouter(social, images))
  if (admin) app.use('/api/admin', requireAuth, createAdminRouter(admin))
  if (billingService) app.use('/api/billing', requireAuth, createBillingRouter(billingService))
  app.use('/api/plans', requireAuth, createPlanRouter(plans))
  app.use('/api/garments', requireAuth, createGarmentRouter(repository, images, extractor, social, plans, sharedRateLimits))
  app.use('/api', requireAuth, createUserDataRouter(userDataRepository, images))
  app.use('/api/generations', requireAuth, createGenerationRouter(imageProvider, repository, userDataRepository, images, credits, sharedRateLimits, plans))
  app.use('/api/mock-images', requireAuth, createMockImageRouter())

  app.use('/api', (_request, response) => {
    response.status(404).json({ message: 'Không tìm thấy API.' })
  })

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Mỗi ảnh phải nhỏ hơn hoặc bằng 10MB.'
        : 'Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.'
      response.status(400).json({ message })
      return
    }
    if (error instanceof ImageProviderError) {
      console.warn(`Image provider failed [${error.code}]: ${error.message}`)
      response.status(error.statusCode).json({
        message: error.publicMessage,
        code: error.code,
      })
      return
    }
    if (error instanceof AuthError) {
      response.status(error.statusCode).json({ message: error.publicMessage })
      return
    }
    console.error('Request failed:', error instanceof Error ? error.message : 'Unknown error')
    response.status(500).json({ message: 'Máy chủ gặp lỗi. Vui lòng thử lại.' })
  }
  app.use(errorHandler)
  return app
}
