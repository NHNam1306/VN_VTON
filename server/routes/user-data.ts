import { Router } from 'express'
import multer from 'multer'
import type { PersonImageRecord, PersonImageResponse } from '../domain/person-image.js'
import type { ImageStorage } from '../storage/image-storage.js'
import type { UserDataRepository } from '../storage/user-data-repository.js'

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      callback(null, true)
      return
    }
    callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname))
  },
})

const toResponse = (record: PersonImageRecord, images: ImageStorage): PersonImageResponse => ({
  id: 'current',
  imageUrl: images.publicUrl(record.imageKey),
  width: record.width,
  height: record.height,
  warnings: record.warnings,
  createdAt: record.createdAt,
})

const parseWarnings = (value: unknown): string[] => {
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((warning): warning is string => typeof warning === 'string')
      .map((warning) => warning.slice(0, 200))
      .slice(0, 5)
  } catch {
    return []
  }
}

export function createUserDataRouter(repository: UserDataRepository, images: ImageStorage) {
  const router = Router()

  router.get('/person-image', (request, response) => {
    const personImage = repository.getPersonImage(request.authUser.id)
    response.json({ item: personImage ? toResponse(personImage, images) : null })
  })

  router.post('/person-image', upload.single('personImage'), async (request, response, next) => {
    let newImageKey: string | null = null
    try {
      const userId = request.authUser.id
      if (!request.file) {
        response.status(400).json({ message: 'Vui lòng chọn ảnh toàn thân.' })
        return
      }
      const width = Number(request.body.width)
      const height = Number(request.body.height)
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || Math.max(width, height) > 1024) {
        response.status(400).json({ message: 'Kích thước ảnh sau resize không hợp lệ.' })
        return
      }

      newImageKey = await images.save(request.file.buffer, request.file.mimetype)
      const record: PersonImageRecord = {
        id: 'current',
        imageKey: newImageKey,
        width,
        height,
        warnings: parseWarnings(request.body.warnings),
        createdAt: new Date().toISOString(),
      }
      const previousResultImageKeys = repository.listTryOnResults(userId)
        .flatMap((result) => result.imageKey ? [result.imageKey] : [])
      const previousKey = repository.upsertPersonImage(userId, record)
      const keysToDelete = [previousKey, ...previousResultImageKeys]
        .filter((key): key is string => Boolean(key) && key !== newImageKey)
        .filter((key) => !repository.isImageKeySaved(userId, key))
      await Promise.all(keysToDelete.map((key) => images.delete(key)))
      response.status(201).json(toResponse(record, images))
    } catch (error) {
      if (newImageKey) await images.delete(newImageKey)
      next(error)
    }
  })

  router.delete('/user-data', async (request, response, next) => {
    try {
      const deleted = repository.clearAllUserData(request.authUser.id)
      const keys = [deleted.personImageKey, ...deleted.resultImageKeys]
        .filter((key): key is string => Boolean(key))
      await Promise.all(keys.map((key) => images.delete(key)))
      response.json({ deleted: true, deletedImageCount: keys.length })
    } catch (error) {
      next(error)
    }
  })

  return router
}
