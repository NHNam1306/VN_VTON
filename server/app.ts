import express, { type ErrorRequestHandler } from 'express'
import path from 'node:path'
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
import type { AuthService } from './auth/auth-service.js'
import { AuthError } from './auth/auth-service.js'
import { createAuthRouter, createRequireAuth } from './auth/auth-http.js'
import { GarmentExtractorService } from './services/garment-extractor.js'
import type { SocialStore } from './social/social-store.js'
import { createSocialRouter } from './social/router.js'

export function createApp(
  repository: GarmentRepository,
  userDataRepository: UserDataRepository,
  images: ImageStorage,
  uploadDirectory: string,
  imageProvider: ImageProvider,
  authService: AuthService,
  secureCookies = false,
  garmentExtractor?: GarmentExtractorService,
  social?: SocialStore,
) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '32kb' }))

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
  app.use('/api/auth', createAuthRouter(authService, secureCookies))
  const requireAuth = createRequireAuth(authService)
  app.use('/uploads', requireAuth, (request, response, next) => {
    response.setHeader('Cache-Control', 'private, no-store')
    if (social && !social.canReadImage(request.authUser.id, decodeURIComponent(request.path.slice(1)))) {
      response.status(404).end(); return
    }
    next()
  }, express.static(path.resolve(uploadDirectory), {
    fallthrough: false,
    cacheControl: false,
  }))
  if (social) app.use('/api/social', requireAuth, createSocialRouter(social))
  app.use('/api/garments', requireAuth, createGarmentRouter(repository, images, extractor, social))
  app.use('/api', requireAuth, createUserDataRouter(userDataRepository, images))
  app.use('/api/generations', requireAuth, createGenerationRouter(imageProvider, repository, userDataRepository, images))
  app.use('/api/mock-images', requireAuth, createMockImageRouter())

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
