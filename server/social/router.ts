import { Router } from 'express'
import type { SocialStore } from './social-store.js'

export function createSocialRouter(store: SocialStore) {
  const router = Router()
  router.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next() })
  router.get('/', (req,res) => res.json(store.snapshot(req.authUser.id)))
  router.get('/search', (req,res) => res.json(store.search(req.authUser.id, String(req.query.q ?? ''))))
  router.get('/invite', (req,res) => res.json(store.resolveInvite(req.authUser.id, String(req.query.code ?? ''))))
  router.get('/profile/:id', (req,res) => res.json(store.profile(req.authUser.id, String(req.params.id))))
  router.post('/:action', (req,res) => res.json(store.act(req.authUser.id, String(req.params.action), req.body ?? {})))
  return router
}
