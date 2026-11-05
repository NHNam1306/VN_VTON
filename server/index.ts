import 'dotenv/config'
import express from 'express'
import { createServer as createHttpServer } from 'node:http'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { createApp } from './app.js'
import { LocalImageStorage } from './storage/local-image-storage.js'
import type { ImageStorage } from './storage/image-storage.js'
import type { GarmentRepository } from './storage/garment-repository.js'
import type { UserDataRepository } from './storage/user-data-repository.js'
import { SqliteGarmentRepository } from './storage/sqlite-garment-repository.js'
import { SqliteUserDataRepository } from './storage/sqlite-user-data-repository.js'
import { PostgresGarmentRepository } from './storage/postgres-garment-repository.js'
import { PostgresUserDataRepository } from './storage/postgres-user-data-repository.js'
import { createPostgresPool, type PostgresPool } from './storage/postgres.js'
import { R2ImageStorage } from './storage/r2-image-storage.js'
import { createImageProvider } from './providers/provider-factory.js'
import { AuthStore } from './auth/auth-store.js'
import { AuthService } from './auth/auth-service.js'
import type { AuthBackend } from './auth/auth-backend.js'
import { SupabaseAuthService } from './auth/supabase-auth-service.js'
import { SocialStore } from './social/social-store.js'
import { PostgresSocialStore } from './social/postgres-social-store.js'
import type { SocialService } from './social/social-service.js'
import { runtimeConfig } from './config/runtime-config.js'
import { AdminService } from './admin/admin-service.js'
import type { AdminRepository } from './admin/admin-repository.js'
import { SqliteAdminRepository } from './admin/sqlite-admin-repository.js'
import { PostgresAdminRepository } from './admin/postgres-admin-repository.js'
import {
  MemoryRateLimitStore,
  PostgresRateLimitStore,
  type RateLimitStore,
} from './http/rate-limit.js'
import { CreditService } from './credits/credit-service.js'
import { PostgresCreditRepository } from './credits/postgres-credit-repository.js'
import { SqliteCreditRepository } from './credits/sqlite-credit-repository.js'
import { PlanService } from './plans/plan-service.js'
import { PostgresPlanRepository } from './plans/postgres-plan-repository.js'
import { SqlitePlanRepository } from './plans/sqlite-plan-repository.js'
import { BillingService } from './billing/billing-service.js'
import { PostgresBillingRepository } from './billing/postgres-billing-repository.js'
import { SqliteBillingRepository } from './billing/sqlite-billing-repository.js'
import { PayosGateway } from './billing/payos-gateway.js'
import { MomoGateway } from './billing/momo-gateway.js'
import type { PaymentGateway } from './billing/types.js'
import { ExcelPaymentLedger } from './billing/excel-payment-ledger.js'

const port = Number(process.env.PORT ?? 8787)
const isDevelopment = process.argv.includes('--dev')
const dataDirectory = path.resolve(process.env.DATA_DIR ?? './data')
const uploadDirectory = path.join(dataDirectory, 'uploads')

const persistenceBackend = process.env.PERSISTENCE_BACKEND ?? 'sqlite'
const imageStorageBackend = process.env.IMAGE_STORAGE ?? 'local'
const authBackend = process.env.AUTH_BACKEND ?? 'local'
const appBaseUrl = process.env.APP_BASE_URL
  ?? process.env.RENDER_EXTERNAL_URL
  ?? `http://127.0.0.1:${port}`

let postgresPool: PostgresPool | undefined
let repository: GarmentRepository
let userDataRepository: UserDataRepository
let authStore: AuthStore | undefined
let authService: AuthBackend
let imageStorage: ImageStorage
let sqliteDatabasePath: string | undefined

if (persistenceBackend === 'postgres') {
  postgresPool = createPostgresPool(process.env.DATABASE_URL ?? '')
  await postgresPool.query('SELECT 1')
  repository = new PostgresGarmentRepository(postgresPool)
  userDataRepository = new PostgresUserDataRepository(postgresPool)
} else if (persistenceBackend === 'sqlite') {
  await mkdir(dataDirectory, { recursive: true })
  sqliteDatabasePath = path.join(dataDirectory, 'fitting-room.sqlite')
  repository = new SqliteGarmentRepository(sqliteDatabasePath)
  userDataRepository = new SqliteUserDataRepository(sqliteDatabasePath)
} else {
  throw new Error(`PERSISTENCE_BACKEND="${persistenceBackend}" không được hỗ trợ.`)
}

if (imageStorageBackend === 'r2') {
  imageStorage = new R2ImageStorage({
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.R2_BUCKET ?? '',
    prefix: process.env.R2_PREFIX,
  })
} else if (imageStorageBackend === 'local') {
  await mkdir(dataDirectory, { recursive: true })
  const localStorage = new LocalImageStorage(uploadDirectory)
  await localStorage.ensureReady()
  imageStorage = localStorage
} else {
  throw new Error(`IMAGE_STORAGE="${imageStorageBackend}" không được hỗ trợ.`)
}

if (authBackend === 'supabase') {
  authService = new SupabaseAuthService(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
    appBaseUrl,
  )
} else if (authBackend === 'local') {
  if (persistenceBackend !== 'sqlite') {
    throw new Error('AUTH_BACKEND=local chỉ dùng cùng PERSISTENCE_BACKEND=sqlite.')
  }
  authStore = new AuthStore(path.join(dataDirectory, 'fitting-room.sqlite'))
  authService = new AuthService(authStore, runtimeConfig.authSessionDays, runtimeConfig.legacyDataClaimToken)
} else {
  throw new Error(`AUTH_BACKEND="${authBackend}" không được hỗ trợ.`)
}

const imageProvider = createImageProvider(imageStorage, { port })
const social: SocialService = persistenceBackend === 'sqlite'
  ? new SocialStore(path.join(dataDirectory, 'fitting-room.sqlite'), userDataRepository as SqliteUserDataRepository)
  : new PostgresSocialStore(postgresPool!)
const adminRepository:AdminRepository=persistenceBackend==='sqlite'
  ? new SqliteAdminRepository(sqliteDatabasePath!)
  : new PostgresAdminRepository(postgresPool!)
const admin=new AdminService(adminRepository,runtimeConfig.adminEmails)
const rateLimitStore: RateLimitStore = persistenceBackend === 'postgres'
  ? new PostgresRateLimitStore(postgresPool!)
  : new MemoryRateLimitStore()
const planService = new PlanService(
  persistenceBackend === 'postgres'
    ? new PostgresPlanRepository(postgresPool!)
    : new SqlitePlanRepository(sqliteDatabasePath!),
)
const creditService = new CreditService(
  persistenceBackend === 'postgres'
    ? new PostgresCreditRepository(postgresPool!)
    : new SqliteCreditRepository(sqliteDatabasePath!),
  planService,
)
const paymentGateways: PaymentGateway[] = []
if (process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY) {
  paymentGateways.push(new PayosGateway({
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
  }))
}
if (process.env.MOMO_PARTNER_CODE && process.env.MOMO_ACCESS_KEY && process.env.MOMO_SECRET_KEY) {
  const momoEndpoint = process.env.MOMO_ENDPOINT
    ?? (process.env.MOMO_ENVIRONMENT === 'production'
      ? 'https://payment.momo.vn/v2/gateway/api/create'
      : 'https://test-payment.momo.vn/v2/gateway/api/create')
  paymentGateways.push(new MomoGateway({
    partnerCode: process.env.MOMO_PARTNER_CODE,
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    endpoint: momoEndpoint,
    requestType: process.env.MOMO_REQUEST_TYPE ?? 'captureWallet',
  }))
}
const billingRepository = persistenceBackend === 'postgres'
    ? new PostgresBillingRepository(postgresPool!)
    : new SqliteBillingRepository(sqliteDatabasePath!)
const paymentLedger = new ExcelPaymentLedger(
  billingRepository,
  path.join(dataDirectory, 'reports', 'payment-transactions.xlsx'),
)
const billingService = new BillingService(
  billingRepository,
  paymentGateways,
  appBaseUrl,
  paymentLedger,
)
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
  admin,
  rateLimitStore,
  creditService,
  planService,
  billingService,
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
  app.use(express.static(frontendDirectory, {
    index: false,
    setHeaders: (response, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      } else {
        response.setHeader('Cache-Control', 'no-cache')
      }
    },
  }))
  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api/') || request.path.startsWith('/uploads/')) {
      next()
      return
    }
    response.setHeader('Cache-Control', 'no-cache')
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
    authStore?.close()
    void social.close()
    void admin.close()
    void rateLimitStore.close?.()
    void creditService.close()
    void planService.close()
    void billingService.close()
    void postgresPool?.end()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
