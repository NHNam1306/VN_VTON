import express, { type ErrorRequestHandler } from 'express'
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
) {
  const app = express()
  const sharedRateLimits = rateLimitStore ?? new MemoryRateLimitStore()
  app.disable('x-powered-by')
  if (runtimeConfig.trustProxyHops) app.set('trust proxy', runtimeConfig.trustProxyHops)
  app.use(setSecurityHeaders)
  app.use('/api', createTokenBucketRateLimit({
    requestsPerMinute: runtimeConfig.apiRequestsPerMinute,
    burst: runtimeConfig.apiBurst,
    skip: (request) => request.path === '/health',
  }))
  app.use(express.json({ limit: '32kb' }))
  app.use('/api', requireMutationHeader)

  const extractor =
    garmentExtractor ??
    new GarmentExtractorService(images, {
      isMock: process.env.IMAGE_PROVIDER === 'mock',
      openrouterApiKey: process.env.OPENROUTER_API_KEY,
      fluxModel: process.env.OPENROUTER_IMAGE_MODEL,
      visionModel: process.env.OPENROUTER_VISION_MODEL,
    })

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' })
  })
  const decorateUser = admin ? (user: Parameters<AdminService['resolveAuthenticatedUser']>[0]) => admin.resolveAuthenticatedUser(user) : undefined
  app.use('/api/auth', createAuthRouter(authService, secureCookies, runtimeConfig.authSessionDays, decorateUser, sharedRateLimits))
  const requireAuth = createRequireAuth(authService, secureCookies, runtimeConfig.authSessionDays, decorateUser)
  app.get('/uploads/:key', requireAuth, async (request, response, next) => {
    try {
      const rawKey = request.params.key
      if (typeof rawKey !== 'string') {
        response.status(400).end()
        return
      }
      const key = decodeURIComponent(rawKey)
      response.setHeader('Cache-Control', 'private, no-store')
      const [garments, person, results, outfits] = await Promise.all([
        repository.list(request.authUser.id),
        userDataRepository.getPersonImage(request.authUser.id),
        userDataRepository.listTryOnResults(request.authUser.id),
        userDataRepository.listSavedOutfits(request.authUser.id),
      ])
      const isOwnImage = garments.some((item) => [
        item.frontOriginalKey, item.frontProcessedKey, item.backOriginalKey, item.backProcessedKey,
      ].includes(key))
        || person?.imageKey === key
        || results.some((item) => item.imageKey === key)
        || outfits.some((item) => item.frontImageKey === key || item.backImageKey === key)
      const canReadSharedImage = social ? await social.canReadImage(request.authUser.id, key) : false
      if (!isOwnImage && !canReadSharedImage) {
        response.status(404).end()
        return
      }
      const image = await images.read(key)
      response.type(image.mimeType).send(image.buffer)
    } catch (error) {
      next(error)
    }
  })
  if (social) app.use('/api/social', requireAuth, createSocialRouter(social, images))
  if (admin) app.use('/api/admin', requireAuth, createAdminRouter(admin))
  app.use('/api/garments', requireAuth, createGarmentRouter(repository, images, extractor, social))
  app.use('/api', requireAuth, createUserDataRouter(userDataRepository, images))
  app.use('/api/generations', requireAuth, createGenerationRouter(imageProvider, repository, userDataRepository, images, sharedRateLimits))
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
