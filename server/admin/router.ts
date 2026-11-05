import { Router } from 'express'
import type { AdminService } from './admin-service.js'

export const createAdminRouter=(service:AdminService)=>{
  const router=Router()
  router.get('/summary',async(request,response,next)=>{try{response.json(await service.summary(request.authUser))}catch(error){next(error)}})
  router.get('/users',async(request,response,next)=>{try{response.json(await service.users(request.authUser,{search:typeof request.query.q==='string'?request.query.q:undefined,role:typeof request.query.role==='string'?request.query.role:undefined,status:typeof request.query.status==='string'?request.query.status:undefined}))}catch(error){next(error)}})
  router.patch('/users/:id',async(request,response,next)=>{try{response.json(await service.updateUser(request.authUser,String(request.params.id),{role:request.body.role,status:request.body.status,creditBalance:request.body.creditBalance,subscriptionPlan:request.body.subscriptionPlan}))}catch(error){next(error)}})
  router.get('/audit',async(request,response,next)=>{try{response.json(await service.audit(request.authUser))}catch(error){next(error)}})
  return router
}
