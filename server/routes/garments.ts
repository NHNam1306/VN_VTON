import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { GARMENT_CATEGORIES, type GarmentCategory, type GarmentRecord, type GarmentResponse } from '../domain/garment.js'
import type { GarmentRepository } from '../storage/garment-repository.js'
import type { ImageStorage } from '../storage/image-storage.js'
import { GarmentExtractorService } from '../services/garment-extractor.js'
import type { SocialService } from '../social/social-service.js'
import { runtimeConfig } from '../config/runtime-config.js'
import { createImageUpload, validateImageContent } from '../http/image-upload.js'
import { createFixedWindowRateLimit } from '../http/rate-limit.js'
import type { PlanService } from '../plans/plan-service.js'

const upload = createImageUpload(4)
export const MAX_GARMENTS_PER_USER = 20

const uploadFields = upload.fields([
  { name: 'frontOriginal', maxCount: 1 },
  { name: 'frontProcessed', maxCount: 1 },
  { name: 'backOriginal', maxCount: 1 },
  { name: 'backProcessed', maxCount: 1 },
])

const toResponse = (record: GarmentRecord, images: ImageStorage): GarmentResponse => ({
  id: record.id,
  name: record.name,
  category: record.category,
  frontOriginalUrl: images.publicUrl(record.frontOriginalKey),
  frontProcessedUrl: images.publicUrl(record.frontProcessedKey),
  backOriginalUrl: record.backOriginalKey ? images.publicUrl(record.backOriginalKey) : null,
  backProcessedUrl: record.backProcessedKey ? images.publicUrl(record.backProcessedKey) : null,
  createdAt: record.createdAt,
})

type GarmentFiles = Partial<Record<string, Express.Multer.File[]>>

export function createGarmentRouter(
  repository: GarmentRepository,
  images: ImageStorage,
  extractor?: GarmentExtractorService,
  social?: SocialService,
  plans?: PlanService,
) {
  const router = Router()
  const singleUpload = upload.single('file')
  const aiRateLimit = createFixedWindowRateLimit({
    max: runtimeConfig.aiRequestsPerWindow,
    windowMs: runtimeConfig.aiRequestWindowMs,
    key: (request) => `${request.authUser.id}:${request.ip ?? 'unknown'}`,
  })
  const wardrobeLimit = async (user: Express.Request['authUser']) =>
    plans ? (await plans.status(user)).entitlements.wardrobeItems : MAX_GARMENTS_PER_USER

  router.get('/', async (request, response, next) => {
    try {
      const items = await repository.list(request.authUser.id)
      response.json({ items: items.map((item) => toResponse(item, images)) })
    } catch (error) {
      next(error)
    }
  })

  router.post('/ai-extract', aiRateLimit, singleUpload, async (request, response, next) => {
    try {
      const maxItems = await wardrobeLimit(request.authUser)
      if ((await repository.list(request.authUser.id)).length >= maxItems) {
        response.status(409).json({ message: `Gói hiện tại lưu tối đa ${maxItems} món trong tủ đồ.` })
        return
      }
      const file = request.file
      if (!file) {
        response.status(400).json({ message: 'Vui lòng tải lên một ảnh để tách nền và tái tạo bằng FLUX.' })
        return
      }
      await validateImageContent(file)

      const defaultCategory = (GARMENT_CATEGORIES.includes(request.body.category)
        ? request.body.category
        : 'tops') as GarmentCategory

      const hasManualOptions =
        request.body.extractOutfit !== undefined || request.body.extractAccessories !== undefined
      const extractOptions = hasManualOptions
        ? {
            extractOutfit: request.body.extractOutfit === 'true' || request.body.extractOutfit === true,
            extractAccessories: request.body.extractAccessories === 'true' || request.body.extractAccessories === true,
          }
        : undefined

      console.info(`[AI Extract] Started category=${defaultCategory} autoDetect=${!hasManualOptions}`)

      const activeExtractor = extractor ?? new GarmentExtractorService(images, {
        isMock: process.env.IMAGE_PROVIDER === 'mock',
        openrouterApiKey: process.env.OPENROUTER_API_KEY,
        fluxModel: process.env.OPENROUTER_IMAGE_MODEL,
        visionModel: process.env.OPENROUTER_VISION_MODEL,
      })

      const items = await activeExtractor.extractAndGenerate(
        file.buffer,
        file.mimetype,
        defaultCategory,
        extractOptions,
      )

      console.info(`[AI Extract] Completed items=${items.length}`)
      for (const item of items) if (item.studioImageUrl.startsWith('/uploads/')) {
        await social?.trackTemporaryImage(request.authUser.id, decodeURIComponent(item.studioImageUrl.slice('/uploads/'.length)))
      }

      response.json({ items })
    } catch (error) {
      console.warn('[AI Extract] Failed safely')
      next(error)
    }
  })

  router.post('/', uploadFields, async (request, response, next) => {
    const savedKeys: string[] = []
    try {
      const maxItems = await wardrobeLimit(request.authUser)
      if ((await repository.list(request.authUser.id)).length >= maxItems) {
        response.status(409).json({ message: `Gói hiện tại lưu tối đa ${maxItems} món trong tủ đồ.` })
        return
      }
      const name = typeof request.body.name === 'string' ? request.body.name.trim() : ''
      const category = request.body.category
      const files = request.files as GarmentFiles
      const frontOriginal = files.frontOriginal?.[0]
      const frontProcessed = files.frontProcessed?.[0]
      const backOriginal = files.backOriginal?.[0]
      const backProcessed = files.backProcessed?.[0]

      if (!name || name.length > 80) {
        response.status(400).json({ message: 'Tên món đồ phải từ 1 đến 80 ký tự.' })
        return
      }
      if (!GARMENT_CATEGORIES.includes(category)) {
        response.status(400).json({ message: 'Loại đồ không hợp lệ.' })
        return
      }
      if (!frontOriginal || !frontProcessed) {
        response.status(400).json({ message: 'Cần ảnh mặt trước gốc và ảnh đã tách nền.' })
        return
      }
      if ((backOriginal && !backProcessed) || (!backOriginal && backProcessed)) {
        response.status(400).json({ message: 'Ảnh mặt sau cần đủ bản gốc và bản đã tách nền.' })
        return
      }

      await Promise.all(
        [frontOriginal, frontProcessed, backOriginal, backProcessed]
          .filter((file): file is Express.Multer.File => Boolean(file))
          .map((file) => validateImageContent(file)),
      )

      const save = async (file: Express.Multer.File) => {
        const key = await images.save(file.buffer, file.mimetype)
        savedKeys.push(key)
        return key
      }

      const record: GarmentRecord = {
        id: randomUUID(),
        userId: request.authUser.id,
        name,
        category,
        frontOriginalKey: await save(frontOriginal),
        frontProcessedKey: await save(frontProcessed),
        backOriginalKey: backOriginal ? await save(backOriginal) : null,
        backProcessedKey: backProcessed ? await save(backProcessed) : null,
        createdAt: new Date().toISOString(),
      }

      const created = await repository.createIfBelowLimit(record, maxItems)
      if (!created) {
        await Promise.all(savedKeys.map((key) => images.delete(key)))
        savedKeys.length = 0
        response.status(409).json({ message: `Gói hiện tại lưu tối đa ${maxItems} món trong tủ đồ.` })
        return
      }
      response.status(201).json(toResponse(record, images))
    } catch (error) {
      await Promise.all(savedKeys.map((key) => images.delete(key)))
      next(error)
    }
  })

  router.patch('/:id', async (request, response, next) => {
    try {
      const name = typeof request.body.name === 'string' ? request.body.name.trim() : undefined
      const category = request.body.category as GarmentCategory | undefined

      if (name !== undefined && (!name || name.length > 80)) {
        response.status(400).json({ message: 'Tên món đồ phải từ 1 đến 80 ký tự.' })
        return
      }
      if (category !== undefined && !GARMENT_CATEGORIES.includes(category)) {
        response.status(400).json({ message: 'Loại đồ không hợp lệ.' })
        return
      }

      const updated = await repository.update(request.authUser.id, request.params.id, {
        name,
        category,
      })
      if (!updated) {
        response.status(404).json({ message: 'Không tìm thấy món đồ.' })
        return
      }

      response.json(toResponse(updated, images))
    } catch (error) {
      next(error)
    }
  })

  router.delete('/:id', async (request, response, next) => {
    try {
      const garment = await repository.findById(request.authUser.id, request.params.id)
      if (!garment) {
        response.status(404).json({ message: 'Không tìm thấy món đồ.' })
        return
      }

      await repository.delete(request.authUser.id, garment.id)
      const keys = [
        garment.frontOriginalKey,
        garment.frontProcessedKey,
        garment.backOriginalKey,
        garment.backProcessedKey,
      ].filter((key): key is string => Boolean(key))
      await Promise.all(keys.map((key) => images.delete(key)))
      response.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  return router
}
