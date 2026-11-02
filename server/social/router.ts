import { Router } from 'express'
import type { SocialService } from './social-service.js'

export function createSocialRouter(store: SocialService) {
  const router = Router()
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next() })
  router.get('/', async (req,res,next) => { try { res.json(await store.snapshot(req.authUser.id)) } catch (error) { next(error) } })
  router.get('/search', async (req,res,next) => { try { res.json(await store.search(req.authUser.id, String(req.query.q ?? ''))) } catch (error) { next(error) } })
  router.get('/invite', async (req,res,next) => { try { res.json(await store.resolveInvite(req.authUser.id, String(req.query.code ?? ''))) } catch (error) { next(error) } })
  router.get('/profile/:id', async (req,res,next) => { try { res.json(await store.profile(req.authUser.id, String(req.params.id))) } catch (error) { next(error) } })
  router.post('/:action', async (req,res,next) => { try { res.json(await store.act(req.authUser.id, String(req.params.action), req.body ?? {})) } catch (error) { next(error) } })
  return router
}
