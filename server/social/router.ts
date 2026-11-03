import { Router } from 'express'
import sharp from 'sharp'
import { createImageUpload, validateImageContent } from '../http/image-upload.js'
import type { ImageStorage } from '../storage/image-storage.js'
import type { SocialService } from './social-service.js'

const avatarUpload = createImageUpload(1).single('avatar')
const imageKeyFromUrl = (value: string) => {
  if (!value.startsWith('/uploads/')) return null
  try { return decodeURIComponent(value.slice('/uploads/'.length)) } catch { return null }
}

export function createSocialRouter(store: SocialService, images: ImageStorage) {
  const router = Router()
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next() })
  router.get('/', async (req,res,next) => { try { res.json(await store.snapshot(req.authUser.id)) } catch (error) { next(error) } })
  router.get('/search', async (req,res,next) => { try { res.json(await store.search(req.authUser.id, String(req.query.q ?? ''))) } catch (error) { next(error) } })
  router.get('/invite', async (req,res,next) => { try { res.json(await store.resolveInvite(req.authUser.id, String(req.query.code ?? ''))) } catch (error) { next(error) } })
  router.get('/profile/:id', async (req,res,next) => { try { res.json(await store.profile(req.authUser.id, String(req.params.id))) } catch (error) { next(error) } })
  router.post('/avatar', avatarUpload, async (req,res,next) => {
    let savedKey: string | null = null
    try {
      if (!req.file) {
        res.status(400).json({ message: 'Hãy chọn một ảnh đại diện.' })
        return
      }
      await validateImageContent(req.file)
      const before = await store.snapshot(req.authUser.id)
      const avatar = await sharp(req.file.buffer)
        .rotate()
        .resize(512, 512, { fit: 'cover', position: 'attention' })
        .webp({ quality: 84 })
        .toBuffer()
      savedKey = await images.save(avatar, 'image/webp')
      const updated = await store.act(req.authUser.id, 'settings', {
        username: before.me.username,
        avatar: images.publicUrl(savedKey),
        invitePolicy: before.me.invitePolicy,
        defaultVisibility: before.me.defaultVisibility,
      })
      const oldKey = imageKeyFromUrl(before.me.avatar)
      if (oldKey && oldKey !== savedKey) await images.delete(oldKey).catch(() => undefined)
      res.json(updated)
    } catch (error) {
      if (savedKey) await images.delete(savedKey).catch(() => undefined)
      next(error)
    }
  })
  router.post('/:action', async (req,res,next) => { try { res.json(await store.act(req.authUser.id, String(req.params.action), req.body ?? {})) } catch (error) { next(error) } })
  return router
}
