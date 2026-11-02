import 'dotenv/config'
import express from 'express'
import { createServer as createHttpServer } from 'node:http'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { createApp } from './app.js'
import { LocalImageStorage } from './storage/local-image-storage.js'
import { SqliteGarmentRepository } from './storage/sqlite-garment-repository.js'
import { SqliteUserDataRepository } from './storage/sqlite-user-data-repository.js'
import { createImageProvider } from './providers/provider-factory.js'
import { AuthStore } from './auth/auth-store.js'
import { AuthService } from './auth/auth-service.js'
import { SocialStore } from './social/social-store.js'
import { runtimeConfig } from './config/runtime-config.js'

const port = Number(process.env.PORT ?? 8787)
const isDevelopment = process.argv.includes('--dev')
const dataDirectory = path.resolve(process.env.DATA_DIR ?? './data')
const uploadDirectory = path.join(dataDirectory, 'uploads')

await mkdir(dataDirectory, { recursive: true })
const imageStorage = new LocalImageStorage(uploadDirectory)
await imageStorage.ensureReady()
const repository = new SqliteGarmentRepository(path.join(dataDirectory, 'fitting-room.sqlite'))
const userDataRepository = new SqliteUserDataRepository(path.join(dataDirectory, 'fitting-room.sqlite'))
const authStore = new AuthStore(path.join(dataDirectory, 'fitting-room.sqlite'))
const authService = new AuthService(authStore, runtimeConfig.authSessionDays, runtimeConfig.legacyDataClaimToken)
const imageProvider = createImageProvider(imageStorage, { port })
const social = new SocialStore(path.join(dataDirectory, 'fitting-room.sqlite'), userDataRepository)
const app = createApp(
  repository,
  userDataRepository,
  imageStorage,
  uploadDirectory,
  imageProvider,
  authService,
  runtimeConfig.secureCookies,
  undefined,
  social,
)
const server = createHttpServer(app)
let closeVite: (() => Promise<void>) | undefined

if (isDevelopment) {
  const { createServer: createViteServer } = await import('vite')
  const vite = await createViteServer({
    appType: 'spa',
    server: {
      middlewareMode: true,
      hmr: { server },
    },
  })
  closeVite = () => vite.close()
  app.use(vite.middlewares)
} else {
  const frontendDirectory = path.resolve('dist')
  app.use(express.static(frontendDirectory))
  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api/') || request.path.startsWith('/uploads/')) {
      next()
      return
    }
    response.sendFile(path.join(frontendDirectory, 'index.html'))
  })
}

const host = process.env.HOST ?? (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1')
server.listen(port, host, () => {
  console.log(`Fitting Room listening on ${host}:${port}`)
})

let isShuttingDown = false
const shutdown = async () => {
  if (isShuttingDown) return
  isShuttingDown = true
  await closeVite?.()
  server.close(() => {
    repository.close()
    userDataRepository.close()
    authStore.close()
    social.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
