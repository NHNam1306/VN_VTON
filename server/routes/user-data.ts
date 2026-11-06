import { Router } from 'express'
import sharp from 'sharp'
import type { PersonImageRecord, PersonImageResponse } from '../domain/person-image.js'
import type { ImageStorage } from '../storage/image-storage.js'
import type { UserDataRepository } from '../storage/user-data-repository.js'
import { createImageUpload, validateImageContent } from '../http/image-upload.js'

const upload = createImageUpload(1)

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

  router.get('/person-image', async (request, response, next) => {
    try {
      const personImage = await repository.getPersonImage(request.authUser.id)
      response.json({ item: personImage ? toResponse(personImage, images) : null })
    } catch (error) {
      next(error)
    }
  })

  router.post('/person-image', upload.single('personImage'), async (request, response, next) => {
    let newImageKey: string | null = null
    try {
      const userId = request.authUser.id
      if (!request.file) {
        response.status(400).json({ message: 'Vui lòng chọn ảnh toàn thân.' })
        return
      }
      await validateImageContent(request.file)
      const normalized = await sharp(request.file.buffer, { limitInputPixels: 24_000_000 })
        .rotate()
        .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90, effort: 4 })
        .toBuffer({ resolveWithObject: true })

      newImageKey = await images.save(normalized.data, 'image/webp')
      const record: PersonImageRecord = {
        id: 'current',
        imageKey: newImageKey,
        width: normalized.info.width,
        height: normalized.info.height,
        warnings: parseWarnings(request.body.warnings),
        createdAt: new Date().toISOString(),
      }
      const previousResultImageKeys = (await repository.listTryOnResults(userId))
        .flatMap((result) => result.imageKey ? [result.imageKey] : [])
      const previousKey = await repository.upsertPersonImage(userId, record)
      const candidates = [previousKey, ...previousResultImageKeys]
        .filter((key): key is string => Boolean(key) && key !== newImageKey)
      const savedChecks = await Promise.all(candidates.map((key) => repository.isImageKeySaved(userId, key)))
      const keysToDelete = candidates.filter((_key, index) => !savedChecks[index])
      await Promise.all(keysToDelete.map((key) => images.delete(key)))
      response.status(201).json(toResponse(record, images))
    } catch (error) {
      if (newImageKey) await images.delete(newImageKey)
      next(error)
    }
  })

  router.delete('/person-image', async (request, response, next) => {
    try {
      const imageKey = await repository.deletePersonImage(request.authUser.id)
      if (imageKey) await images.delete(imageKey)
      response.json({ deleted: Boolean(imageKey) })
    } catch (error) {
      next(error)
    }
  })

  router.delete('/user-data', async (request, response, next) => {
    try {
      const deleted = await repository.clearAllUserData(request.authUser.id)
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
